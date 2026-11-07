import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addLocalScore, createRunId, MAX_SCORE, normalizeName, parseScores, readLocalScores, SCORE_KEY, sortScores, validScore,
} from "../src/lib/highScores.ts";
import { loadProgress, saveProgress } from "../src/hooks/useHighScores.ts";

const entry = { name: "NURSE", score: 1000, level: 2, date: 100 };
const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
  });
  return data;
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

describe("high score records", () => {
  it("normalizes eight-character nicknames and strips markup", () => {
    assert.equal(normalizeName("  nurse   1  "), "NURSE 1");
    assert.equal(normalizeName("abcdefghijk"), "ABCDEFGH");
    assert.equal(normalizeName("<script>"), "SCRIPT");
    assert.equal(normalizeName("?!"), "NURSE");
  });

  it("rejects invalid and non-finite scores and shifts", () => {
    for (const score of [NaN, Infinity, -1, 0, 1.5, MAX_SCORE + 1]) assert.equal(validScore(score, 1), false);
    for (const level of [NaN, 0, 51, 1.2]) assert.equal(validScore(10, level), false);
    assert.equal(validScore(MAX_SCORE, 50), true);
  });

  it("preserves valid scores from the existing v1 storage format", () => {
    storage({ [SCORE_KEY]: JSON.stringify([entry]) });
    assert.deepEqual(readLocalScores(), [entry]);
  });

  it("ignores malformed records instead of crashing the start screen", () => {
    assert.deepEqual(parseScores([null, true, { score: 20 }, { ...entry, date: NaN }, { ...entry, name: 5 }, entry]), [entry]);
    assert.deepEqual(parseScores({ scores: [entry] }), []);
    storage({ [SCORE_KEY]: "broken JSON" });
    assert.deepEqual(readLocalScores(), []);
  });

  it("handles browsers that deny access to localStorage", () => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    assert.deepEqual(readLocalScores(), []);
    assert.equal(loadProgress(), 1);
    assert.doesNotThrow(() => saveProgress(5));
  });

  it("sorts by score, then shift, then earliest entry without mutating input", () => {
    const values = [
      { ...entry, id: "c", level: 2, date: 30 },
      { ...entry, id: "b", level: 3, date: 20 },
      { ...entry, id: "a", level: 3, date: 10 },
      { ...entry, id: "d", score: 2000 },
    ];
    assert.deepEqual(sortScores(values).map((score) => score.id), ["d", "a", "b", "c"]);
    assert.equal(values[0].id, "c");
  });

  it("keeps only the best eight entries", () => {
    const scores = Array.from({ length: 10 }, (_, i) => ({ ...entry, score: i + 1 }));
    assert.equal(parseScores(scores).length, 8);
    assert.equal(parseScores(scores)[0].score, 10);
    assert.equal(parseScores(scores)[7].score, 3);
  });

  it("does not create duplicate local entries when an online request is retried", () => {
    const run = { ...entry, id: createRunId() };
    const first = addLocalScore([], run);
    const retried = addLocalScore(first, run);
    assert.equal(retried.length, 1);
    assert.deepEqual(retried[0], run);
  });

  it("generates distinct UUID run identifiers", () => {
    const ids = Array.from({ length: 100 }, createRunId);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });

  it("keeps unlocked shift progress compatible with previous releases", () => {
    const data = storage({ "carecall.progress.v1": "15" });
    assert.equal(loadProgress(), 15);
    saveProgress(4);
    assert.equal(data.get("carecall.progress.v1"), "15");
    saveProgress(99);
    assert.equal(loadProgress(), 50);
  });
});