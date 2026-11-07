import { useCallback, useEffect, useRef, useState } from "react";
import {
  addLocalScore, createRunId, normalizeName, readLocalScores, SCORE_KEY, SCORE_LIMIT, validScore, type ScoreEntry,
} from "../lib/highScores";

export type { ScoreEntry } from "../lib/highScores";

const PROGRESS = "carecall.progress.v1";

export function loadProgress(): number {
  try {
    const v = parseInt(localStorage.getItem(PROGRESS) || "1", 10);
    return Number.isFinite(v) ? Math.min(50, Math.max(1, v)) : 1;
  } catch {
    return 1;
  }
}

export function saveProgress(level: number) {
  try {
    const cur = loadProgress();
    if (level > cur) localStorage.setItem(PROGRESS, String(Math.min(50, level)));
  } catch {
    /* ignore */
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<ScoreEntry[]>(readLocalScores);
  const scoresRef = useRef(scores);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SCORE_KEY && event.key !== null) return;
      const next = readLocalScores();
      scoresRef.current = next;
      setScores(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const submit = useCallback((name: string, score: number, level: number, runId = createRunId()) => {
    if (!validScore(score, level)) throw new Error("This score is not valid.");
    const entry = scoresRef.current.find((item) => item.id === runId) || {
      id: runId, name: normalizeName(name), score, level, date: Date.now(),
    };
    const next = addLocalScore(scoresRef.current, entry);
    let localPersisted = false;
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(next));
      localPersisted = true;
    } catch { /* Scores remain usable in memory when browser storage is blocked. */ }
    scoresRef.current = next;
    setScores(next);
    return { localRanked: next.some((item) => item.id === runId), localPersisted };
  }, []);

  const qualifies = useCallback((score: number) => {
    if (score <= 0) return false;
    return scores.length < SCORE_LIMIT || score >= (scores[scores.length - 1]?.score ?? 0);
  }, [scores]);

  const best = scores.length ? scores[0].score : 0;

  return { scores, submit, qualifies, best };
}
