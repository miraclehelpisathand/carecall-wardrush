import { useCallback, useEffect, useState } from "react";

export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  date: number;
}

const KEY = "carecall.scores.v1";
const PROGRESS = "carecall.progress.v1";
const MAX = 8;

function load(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s.score === "number").sort((a, b) => b.score - a.score).slice(0, MAX);
  } catch {
    return [];
  }
}

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
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    setScores(load());
  }, []);

  const submit = useCallback((name: string, score: number, level: number) => {
    const next = [...load(), { name: name.slice(0, 8).toUpperCase() || "NURSE", score, level, date: Date.now() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setScores(next);
  }, []);

  const qualifies = useCallback((score: number) => {
    if (score <= 0) return false;
    const cur = load();
    return cur.length < MAX || score > (cur[cur.length - 1]?.score ?? 0);
  }, []);

  const best = scores.length ? scores[0].score : 0;

  return { scores, submit, qualifies, best };
}
