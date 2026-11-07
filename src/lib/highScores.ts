export interface ScoreEntry {
  id?: string;
  name: string;
  score: number;
  level: number;
  date: number;
}

export interface ScoreSubmission {
  runId: string;
  name: string;
  score: number;
  level: number;
  startLevel: number;
}

export interface ScoreSaveResult {
  localRanked: boolean;
  localPersisted: boolean;
  sharedSaved: boolean;
  error?: string;
}

export const SCORE_KEY = "carecall.scores.v1";
export const SCORE_LIMIT = 8;
export const MAX_SCORE = 10_000_000;

export function normalizeName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/ +/g, " ").slice(0, 8).trim() || "NURSE";
}

export function validScore(score: number, level: number): boolean {
  return Number.isSafeInteger(score) && score > 0 && score <= MAX_SCORE && Number.isInteger(level) && level >= 1 && level <= 50;
}

export function sortScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((a, b) => b.score - a.score || b.level - a.level || a.date - b.date || (a.id || "").localeCompare(b.id || ""));
}

export function parseScores(value: unknown): ScoreEntry[] {
  if (!Array.isArray(value)) return [];
  const scores: ScoreEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || typeof row.score !== "number" || typeof row.level !== "number" ||
      typeof row.date !== "number" || !Number.isSafeInteger(row.date) || row.date < 0 || !validScore(row.score, row.level)) continue;
    scores.push({
      ...(typeof row.id === "string" ? { id: row.id } : {}),
      name: normalizeName(row.name), score: row.score, level: row.level, date: row.date,
    });
  }
  return sortScores(scores).slice(0, SCORE_LIMIT);
}

export function readLocalScores(): ScoreEntry[] {
  try {
    return parseScores(JSON.parse(localStorage.getItem(SCORE_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function addLocalScore(scores: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
  return sortScores([...scores.filter((score) => !entry.id || score.id !== entry.id), entry]).slice(0, SCORE_LIMIT);
}

export function createRunId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}