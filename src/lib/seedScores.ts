import type { ScoreEntry } from "./highScores";

/**
 * Opening leaderboard for a fresh deployment, so the board is never empty.
 *
 * Scores are taken from the game's real scoring model (see scripts/score-curve.ts):
 * each entry sits inside the plausible cumulative band for the shift it reached.
 * TONY leads on 248,650 — a strong run that ends around shift 20.
 *
 * The same rows are seeded into Supabase by the SQL migration. `tests/seed.test.ts`
 * asserts the two lists stay identical.
 */
export interface SeedScore {
  name: string;
  score: number;
  level: number;
}

export const SEED_SCORES: readonly SeedScore[] = [
  { name: "TONY", score: 248650, level: 20 },
  { name: "MATRON", score: 231480, level: 19 },
  { name: "NURSE JO", score: 214905, level: 19 },
  { name: "DEV 42", score: 198340, level: 18 },
  { name: "SCRUBS", score: 184720, level: 18 },
  { name: "NIGHTOWL", score: 171265, level: 17 },
  { name: "PRIYA", score: 158910, level: 16 },
  { name: "BLUECAP", score: 146380, level: 16 },
  { name: "RM 10", score: 134025, level: 15 },
  { name: "HAZEL", score: 122470, level: 14 },
  { name: "STEADY", score: 111905, level: 13 },
  { name: "OMAR", score: 101340, level: 12 },
  { name: "JANET", score: 91780, level: 12 },
  { name: "TEA RUN", score: 82155, level: 11 },
  { name: "KWAME", score: 73600, level: 10 },
  { name: "SHIFT 9", score: 61240, level: 9 },
  { name: "LUCY", score: 49815, level: 8 },
  { name: "ROOKIE", score: 36270, level: 7 },
  { name: "AIDES", score: 21430, level: 5 },
  { name: "INTERN", score: 12460, level: 4 },
];

/** Fixed, deliberately old timestamps so any real run wins a tie. */
const SEED_EPOCH = Date.UTC(2026, 0, 1, 6, 0, 0);

/** Stable ids let React key seed rows without colliding with real run ids. */
export const SEED_ENTRIES: ScoreEntry[] = SEED_SCORES.map((row, i) => ({
  id: `seed-${String(i + 1).padStart(2, "0")}`,
  name: row.name,
  score: row.score,
  level: row.level,
  date: SEED_EPOCH + i * 60_000,
}));

export function isSeedId(id?: string): boolean {
  return Boolean(id && id.startsWith("seed-"));
}
