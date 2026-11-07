import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/202611070001_carecall_leaderboard.sql", import.meta.url), "utf8");
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
  return db.query("select * from public.carecall_submit_score($1::uuid, $2::text, $3::integer, $4::integer, $5::integer)", [id, name, score, level, startLevel]);
}

describe("Supabase leaderboard migration", () => {
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
    await db.exec(migration);
  });

  beforeEach(async () => {
    await db.exec(`
      reset role;
      delete from auth.users;
      insert into auth.users values ('${alice}'), ('${bob}');
      select set_config('request.jwt.claim.sub', '', false);
    `);
  });

  after(async () => { await db?.close(); });

  it("enables Row Level Security on the private table", async () => {
    const result = await db.query<{ relrowsecurity: boolean }>(`
      select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'carecall_private' and c.relname = 'scores'
    `);
    assert.equal(result.rows[0].relrowsecurity, true);
  });

  it("allows public reads but not public submissions", async () => {
    await db.exec("set role anon");
    assert.deepEqual((await db.query("select * from public.carecall_leaderboard()")).rows, []);
    await assert.rejects(submit(), { code: "42501" });
  });

  it("denies direct table reads and modifications to guest users", async () => {
    await asGuest();
    for (const statement of [
      "select * from carecall_private.scores",
      `insert into carecall_private.scores (run_id, player_id, name, score, level) values ('${run}', '${alice}', 'HACK', 999, 1)`,
      "update carecall_private.scores set score = 99",
      "delete from carecall_private.scores",
    ]) await assert.rejects(db.exec(statement), { code: "42501" });
  });

  it("requires a real authenticated guest identity", async () => {
    await db.exec("set role authenticated");
    await assert.rejects(submit(), { code: "42501" });
  });

  it("validates nickname, score, shift and start shift on the server", async () => {
    await asGuest();
    for (const name of ["", "<script>", "NINECHARS", "BAD!", "       "]) await assert.rejects(submit(run, name), { code: "22023" });
    for (const score of [-1, 0, 10000001]) await assert.rejects(submit(run, "NURSE", score), { code: "22023" });
    for (const level of [0, 51]) await assert.rejects(submit(run, "NURSE", 100, level), { code: "22023" });
    await assert.rejects(submit(run, "NURSE", 100, 10, 5), { code: "22023" });
  });

  it("saves a normalized nickname with a server timestamp, without exposing guest IDs", async () => {
    await asGuest();
    const saved = await submit(run, " nurse ");
    const record = saved.rows[0] as { name: string; created_at: Date };
    assert.equal(record.name, "NURSE");
    assert.ok(Math.abs(new Date(record.created_at).getTime() - Date.now()) < 5000);
    assert.deepEqual(Object.keys(record).sort(), ["run_id", "name", "score", "level", "created_at"].sort());
  });

  it("makes identical retries idempotent even inside the rate limit", async () => {
    await asGuest();
    const first = await submit();
    const retry = await submit();
    assert.deepEqual(retry.rows, first.rows);
    await db.exec("reset role");
    assert.equal((await db.query<{ count: number }>("select count(*)::integer as count from carecall_private.scores")).rows[0].count, 1);
  });

  it("does not allow an already submitted run to change", async () => {
    await asGuest();
    await submit();
    await assert.rejects(submit(run, "NURSE", 5000), { code: "22023" });
    await assert.rejects(submit(run, "OTHER"), { code: "22023" });
  });

  it("does not let another guest claim an existing run", async () => {
    await asGuest();
    await submit();
    await db.exec("reset role");
    await asGuest(bob);
    await assert.rejects(submit(), { code: "22023" });
  });

  it("enforces one new submission per minute, independently for each guest", async () => {
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

  it("returns only the top eight public scores, in the documented order", async () => {
    for (let i = 1; i <= 10; i++) {
      await db.query(`insert into carecall_private.scores (run_id, player_id, name, score, level, created_at)
        values ($1, $2, 'NURSE', $3, 1, '2026-01-01T00:00:00Z')`, [`30000000-0000-4000-8000-${String(i).padStart(12, "0")}`, alice, i * 100]);
    }
    await db.exec("set role anon");
    const board = await db.query<{ score: number; player_id?: string }>("select * from public.carecall_leaderboard()");
    assert.deepEqual(board.rows.map((row) => row.score), [1000, 900, 800, 700, 600, 500, 400, 300]);
    assert.ok(board.rows.every((row) => !("player_id" in row)));
  });

  it("can rerun the migration without deleting scores", async () => {
    await asGuest();
    await submit();
    await db.exec("reset role");
    await db.exec(migration);
    assert.equal((await db.query("select * from public.carecall_leaderboard()")).rows.length, 1);
  });
});