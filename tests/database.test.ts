import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { SEED_SCORES } from "../src/lib/seedScores.ts";

const base = await readFile(new URL("../supabase/migrations/202611070001_carecall_leaderboard.sql", import.meta.url), "utf8");
const top20 = await readFile(new URL("../supabase/migrations/202611080001_carecall_top20_seed.sql", import.meta.url), "utf8");
const anyStart = await readFile(new URL("../supabase/migrations/202611090001_carecall_any_start.sql", import.meta.url), "utf8");

let db: PGlite;
const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const run = "20000000-0000-4000-8000-000000000001";
const run2 = "20000000-0000-4000-8000-000000000002";

async function asGuest(id = alice) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}

async function submit(id = run, name = "NURSE", score = 1000, level = 2, startLevel = 1) {
  return db.query(
    "select * from public.carecall_submit_score($1::uuid, $2::text, $3::integer, $4::integer, $5::integer)",
    [id, name, score, level, startLevel],
  );
}

async function board() {
  return db.query<{ run_id: string; name: string; score: number; level: number }>("select * from public.carecall_leaderboard()");
}

/** Fill all 20 places with real, owned scores. */
async function fillBoard(lowest = 1000) {
  for (let i = 0; i < 20; i++) {
    await db.query(
      `insert into carecall_private.scores (run_id, player_id, name, score, level, created_at, is_seed)
       values ($1, $2, 'HOUSE', $3, 10, '2026-01-01T00:00:00Z', false)`,
      [`30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, alice, lowest + (19 - i) * 100],
    );
  }
}

describe("leaderboard database", () => {
  before(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `);
    await db.exec(base);
    await db.exec(top20);
    await db.exec(anyStart);
  });

  beforeEach(async () => {
    await db.exec(`
      reset role;
      delete from carecall_private.scores;
      delete from auth.users;
      select set_config('request.jwt.claim.sub', '', false);
    `);
    await db.query("insert into auth.users values ($1), ($2)", [alice, bob]);
  });

  after(async () => { await db?.close(); });

  it("enables Row Level Security and denies direct table access", async () => {
    const rls = await db.query<{ relrowsecurity: boolean }>(`
      select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'carecall_private' and c.relname = 'scores'`);
    assert.equal(rls.rows[0].relrowsecurity, true);
    await asGuest();
    for (const sql of [
      "select * from carecall_private.scores",
      "update carecall_private.scores set score = 1",
      "delete from carecall_private.scores",
    ]) await assert.rejects(db.exec(sql), { code: "42501" });
  });

  it("lets anyone read but only guests write", async () => {
    await db.exec("set role anon");
    assert.deepEqual((await board()).rows, []);
    await assert.rejects(submit(), { code: "42501" });
  });

  it("requires an authenticated guest identity", async () => {
    await db.exec("set role authenticated");
    await assert.rejects(submit(), { code: "42501" });
  });

  it("validates name, score and shift server-side", async () => {
    await asGuest();
    for (const name of ["", "<script>", "NINECHARS", "BAD!", "     "]) {
      await assert.rejects(submit(run, name), { code: "22023" });
    }
    for (const score of [-1, 0, 10000001]) await assert.rejects(submit(run, "NURSE", score), { code: "22023" });
    for (const level of [0, 51]) await assert.rejects(submit(run, "NURSE", 100, level), { code: "22023" });
  });

  it("accepts runs wherever they started — every run competes", async () => {
    await asGuest();
    assert.equal((await submit(run, "LATE", 5000, 12, 5)).rows.length, 1);
    await db.exec("reset role");
    const n = await db.query<{ count: number }>("select count(*)::integer as count from carecall_private.scores");
    assert.equal(n.rows[0].count, 1);
  });

  it("stores a qualifying run without exposing the guest id", async () => {
    await asGuest();
    const saved = await submit(run, " nurse ");
    const row = saved.rows[0] as Record<string, unknown>;
    assert.equal(row.name, "NURSE");
    assert.deepEqual(Object.keys(row).sort(), ["created_at", "level", "name", "run_id", "score"]);
  });

  it("is idempotent on retry, even inside the rate limit", async () => {
    await asGuest();
    const first = await submit();
    assert.deepEqual((await submit()).rows, first.rows);
    await db.exec("reset role");
    const n = await db.query<{ count: number }>("select count(*)::integer as count from carecall_private.scores");
    assert.equal(n.rows[0].count, 1);
  });

  it("will not let a run change or be claimed by another guest", async () => {
    await asGuest();
    await submit();
    await assert.rejects(submit(run, "NURSE", 5000), { code: "22023" });
    await db.exec("reset role");
    await asGuest(bob);
    await assert.rejects(submit(), { code: "22023" });
  });

  it("rate limits each guest to one new run per minute", async () => {
    await asGuest();
    await submit();
    await assert.rejects(submit(run2), { code: "P0001", message: "RATE_LIMITED" });
    await db.exec("reset role");
    await asGuest(bob);
    assert.equal((await submit(run2)).rows.length, 1);
  });

  it("accepts a new run after the cooldown", async () => {
    await asGuest();
    await submit();
    await db.exec("reset role; update carecall_private.scores set created_at = now() - interval '2 minutes'");
    await asGuest();
    assert.equal((await submit(run2)).rows.length, 1);
  });

  it("returns the top twenty in rank order", async () => {
    for (let i = 1; i <= 26; i++) {
      await db.query(
        `insert into carecall_private.scores (run_id, player_id, name, score, level, created_at, is_seed)
         values ($1, $2, 'NURSE', $3, 1, '2026-01-01T00:00:00Z', false)`,
        [`30000000-0000-4000-8000-${String(i).padStart(12, "0")}`, alice, i * 100],
      );
    }
    await db.exec("set role anon");
    const rows = (await board()).rows;
    assert.equal(rows.length, 20);
    assert.deepEqual(rows.map((r) => r.score), Array.from({ length: 20 }, (_, i) => 2600 - i * 100));
    assert.ok(rows.every((r) => !("player_id" in r)));
  });

  it("rejects a run that cannot reach the top twenty", async () => {
    await fillBoard(1000);          // lowest place = 1000
    await asGuest(bob);
    await assert.rejects(submit(run, "LOWBALL", 1000), { code: "P0001", message: "BELOW_CUTOFF" });
    await assert.rejects(submit(run, "LOWBALL", 999), { code: "P0001", message: "BELOW_CUTOFF" });
    await db.exec("reset role");
    const n = await db.query<{ count: number }>("select count(*)::integer as count from carecall_private.scores");
    assert.equal(n.rows[0].count, 20, "nothing was written");
  });

  it("stores a run that beats the twentieth place", async () => {
    await fillBoard(1000);
    await asGuest(bob);
    assert.equal((await submit(run, "CHASER", 1001)).rows.length, 1);
    await db.exec("set role anon");
    const rows = (await board()).rows;
    assert.equal(rows.length, 20);
    assert.equal(rows[19].score, 1001);
    assert.equal(rows[19].name, "CHASER");
  });

  it("pushes lower places down and drops the 20th off the board", async () => {
    await fillBoard(1000); // places hold 2900 … 1000
    await asGuest(bob);
    await submit(run, "MID", 1550, 10); // lands mid-board
    await db.exec("set role anon");
    const rows = (await board()).rows;
    assert.equal(rows.length, 20);
    const names = rows.map((r) => r.name);
    const scores = rows.map((r) => r.score);
    // MID slots in ranked order, everything beneath shifts down one place …
    assert.equal(names[scores.indexOf(1550)], "MID");
    assert.ok(scores.indexOf(1550) > 0 && scores.indexOf(1550) < 19);
    // … and the old 20th (1000) falls off entirely.
    assert.ok(!scores.includes(1000), "lowest score drops off");
    assert.equal(Math.min(...scores), 1100);
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].score >= rows[i].score);
  });

  it("accepts any score while the board still has room", async () => {
    await asGuest();
    assert.equal((await submit(run, "FIRST", 5)).rows.length, 1);
  });

  it("seeds the opening board on an empty database, TONY leading near shift 20", async () => {
    await db.exec("reset role");
    await db.exec(top20);
    await db.exec("set role anon");
    const rows = (await board()).rows;
    assert.equal(rows.length, 20);
    assert.equal(rows[0].name, "TONY");
    assert.equal(rows[0].level, 20);
    assert.equal(rows[0].score, SEED_SCORES[0].score);
    assert.ok(rows[0].score > 200_000 && rows[0].score < 260_000, "top score is a level-20 band score");
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].score > rows[i].score, "strictly descending");
  });

  it("never re-seeds over real player scores", async () => {
    await asGuest();
    await submit(run, "REALONE", 500);
    await db.exec("reset role");
    await db.exec(top20);
    const rows = (await board()).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "REALONE");
  });

  it("does not let a guest claim or overwrite a seeded row", async () => {
    await db.exec("reset role");
    await db.exec(top20);
    const seeded = (await board()).rows[0];
    await asGuest();
    await assert.rejects(
      submit(seeded.run_id, seeded.name, seeded.score, seeded.level),
      { code: "22023" },
    );
  });

  it("does not let house scores trigger the per-guest rate limit", async () => {
    await db.exec("reset role");
    await db.exec(top20);
    await asGuest();
    assert.equal((await submit(run, "NEWNURSE", 300000, 21)).rows.length, 1);
  });

  it("keeps every score when all migrations are re-run", async () => {
    await asGuest();
    await submit();
    await db.exec("reset role");
    await db.exec(base);
    await db.exec(top20);
    await db.exec(anyStart);
    assert.equal((await board()).rows.length, 1);
  });
});
