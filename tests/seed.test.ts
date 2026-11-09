import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SEED_ENTRIES, SEED_SCORES, isSeedId } from "../src/lib/seedScores.ts";
import { SCORE_LIMIT, normalizeName, parseScores, qualifiesFor, rankFor, sortScores } from "../src/lib/highScores.ts";

const sql = await readFile(
  new URL("../supabase/migrations/202611080001_carecall_top20_seed.sql", import.meta.url),
  "utf8",
);

/** Pull the seeded (name, score, level) triples straight out of the migration. */
function sqlSeeds() {
  const rows: { name: string; score: number; level: number }[] = [];
  const re = /'00000000-0000-4000-8000-\d{12}'::uuid,\s*'([^']+)',\s*(\d+),\s*(\d+),\s*\d+\)/g;
  for (const m of sql.matchAll(re)) rows.push({ name: m[1], score: Number(m[2]), level: Number(m[3]) });
  return rows;
}

describe("opening leaderboard", () => {
  it("fills exactly the twenty places the board shows", () => {
    assert.equal(SCORE_LIMIT, 20);
    assert.equal(SEED_SCORES.length, 20);
    assert.equal(SEED_ENTRIES.length, 20);
  });

  it("matches the SQL seed rows exactly", () => {
    assert.deepEqual(sqlSeeds(), SEED_SCORES.map((s) => ({ name: s.name, score: s.score, level: s.level })));
  });

  it("puts TONY first with a score from the shift-20 band", () => {
    const top = SEED_SCORES[0];
    assert.equal(top.name, "TONY");
    assert.equal(top.level, 20);
    assert.ok(top.score > 200_000 && top.score < 260_000, `${top.score} should read as a level-20 run`);
  });

  it("descends strictly and stays inside the legal score range", () => {
    for (let i = 0; i < SEED_SCORES.length; i++) {
      const row = SEED_SCORES[i];
      assert.ok(row.score > 0 && row.score <= 10_000_000);
      assert.ok(row.level >= 1 && row.level <= 50);
      if (i) assert.ok(SEED_SCORES[i - 1].score > row.score, `row ${i} must be lower`);
    }
  });

  it("uses names the server will accept", () => {
    for (const row of SEED_SCORES) {
      assert.match(row.name, /^[A-Z0-9][A-Z0-9 ]{0,7}$/, row.name);
      assert.equal(normalizeName(row.name), row.name);
    }
  });

  it("survives the shared parser without losing rows", () => {
    const parsed = parseScores(SEED_ENTRIES.map((e) => ({ ...e })));
    assert.equal(parsed.length, 20);
    assert.equal(parsed[0].name, "TONY");
    assert.deepEqual(parsed.map((p) => p.score), sortScores(SEED_ENTRIES).map((p) => p.score));
  });

  it("tags house rows so they can be told apart from real runs", () => {
    assert.ok(SEED_ENTRIES.every((e) => isSeedId(e.id)));
    assert.equal(isSeedId("20000000-0000-4000-8000-000000000001"), false);
    assert.equal(isSeedId(undefined), false);
  });

  it("dates house rows before any real run so ties favour players", () => {
    assert.ok(SEED_ENTRIES.every((e) => e.date < Date.now()));
  });
});

describe("qualification", () => {
  const full = SEED_ENTRIES;
  const lowest = full[full.length - 1].score;

  it("accepts anything while places remain", () => {
    assert.equal(qualifiesFor([], 1), true);
    assert.equal(qualifiesFor(full.slice(0, 19), 1), true);
  });

  it("needs a strict improvement once twenty places are taken", () => {
    assert.equal(qualifiesFor(full, lowest), false);
    assert.equal(qualifiesFor(full, lowest + 1), true);
    assert.equal(qualifiesFor(full, 0), false);
    assert.equal(qualifiesFor(full, Number.NaN), false);
  });

  it("ranks a new run where it belongs", () => {
    assert.equal(rankFor(full, SEED_SCORES[0].score + 1, 21), 1);
    assert.equal(rankFor(full, lowest + 1, 5), 20);
    assert.equal(rankFor(full, lowest, 1), null);
    assert.equal(rankFor([], 500, 1), 1);
  });

  it("breaks score ties on the further shift", () => {
    const tied = [{ id: "a", name: "A", score: 1000, level: 5, date: 1 }];
    assert.equal(rankFor(tied, 1000, 6), 1);
    assert.equal(rankFor(tied, 1000, 4), 2);
  });

  it("lets a real run displace the weakest house score", () => {
    const mine = { id: "real", name: "ME", score: lowest + 50, level: 5, date: Date.now() };
    const merged = sortScores([...full, mine]).slice(0, SCORE_LIMIT);
    assert.equal(merged.length, 20);
    assert.ok(merged.some((m) => m.id === "real"));
    assert.ok(!merged.some((m) => m.id === full[19].id), "INTERN drops off");
  });
});
