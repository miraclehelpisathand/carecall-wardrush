/**
 * Grounds the seeded leaderboard in the real scoring model.
 * Simulates a competent player clearing each shift and reports cumulative score.
 */
import { buildLevel, callLimit } from "../src/game/levels.ts";
import { CALL_META, MESS } from "../src/game/constants.ts";

function run(skill: number, speed: number, until: number) {
  let score = 0;
  let combo = 0;
  let lives = 3;
  const rows: { level: number; cumulative: number }[] = [];
  for (let level = 1; level <= until; level++) {
    const cfg = buildLevel(level);
    let missed = 0;
    for (const spawn of cfg.spawns) {
      // skill = chance of answering a call at all
      if (Math.random() > skill) { missed++; combo = 0; lives--; continue; }
      const mult = Math.min(5, 1 + combo * 0.2);
      const limit = callLimit(cfg, spawn.kind, spawn.task);
      const remaining = limit * speed;
      const speedBonus = 1 + Math.max(0, remaining / limit) * 0.6;
      let pts = Math.round(CALL_META[spawn.kind].points * mult * speedBonus);
      if (spawn.task === "toilet") pts += 180;
      if (spawn.task === "meal") pts += 90;
      score += pts;
      combo++;
    }
    const clearBonus = 220 + level * 70;
    const lifeBonus = lives * 110;
    const perfect = missed === 0 ? 400 : 0;
    score += Math.max(0, clearBonus + lifeBonus + perfect + 150);
    if (level % 10 === 0 && lives < 5) lives += 1;
    rows.push({ level, cumulative: score });
    if (lives <= 0) break;
  }
  return rows;
}

function average(skill: number, speed: number, until: number, trials = 400) {
  const totals = new Array(until).fill(0);
  const counts = new Array(until).fill(0);
  for (let t = 0; t < trials; t++) {
    for (const row of run(skill, speed, until)) {
      totals[row.level - 1] += row.cumulative;
      counts[row.level - 1]++;
    }
  }
  return totals.map((sum, i) => (counts[i] ? Math.round(sum / counts[i]) : 0));
}

const strong = average(1, 0.45, 21);      // flawless, fast
const good = average(0.985, 0.38, 21);    // very good
const solid = average(0.96, 0.3, 21);     // competent

console.log("lvl  flawless    very-good   competent");
for (const l of [1, 2, 3, 5, 8, 10, 12, 15, 18, 19, 20, 21]) {
  console.log(
    String(l).padStart(3),
    String(strong[l - 1]).padStart(9),
    String(good[l - 1]).padStart(11),
    String(solid[l - 1]).padStart(11),
  );
}
console.log("\nMESS.points =", MESS.points);
console.log("\nReached-level-20 band:", good[18], "→", strong[19]);
