import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeName, parseScores, validScore, type ScoreEntry, type ScoreSubmission } from "./highScores";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

export const sharedLeaderboardConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;
let signingIn: Promise<void> | null = null;

async function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const signal = init?.signal;
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 10_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function getClient(): SupabaseClient {
  if (!sharedLeaderboardConfigured) throw new Error("The shared leaderboard is not connected yet.");
  if (client) return client;
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))) {
    throw new Error("The leaderboard requires a secure database URL.");
  }
  // A frontend build must never be given a database/admin key, even via CI.
  let legacyAnon = false;
  if (key.startsWith("eyJ")) {
    try {
      legacyAnon = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "anon";
    } catch { /* invalid key */ }
  }
  if (!key.startsWith("sb_publishable_") && !legacyAnon) {
    throw new Error("Use a Supabase publishable key, never a secret or service-role key.");
  }
  client = createClient(url, key, {
    auth: {
      detectSessionInUrl: false,
      storageKey: `carecall.leaderboard.auth.${endpoint.hostname}`,
    },
    global: { fetch: timedFetch },
  });
  return client;
}

function decodeRows(data: unknown): ScoreEntry[] {
  if (!Array.isArray(data)) throw new Error("The leaderboard returned an invalid response.");
  const mapped = data.map((row: Record<string, unknown>) => ({
    id: row.run_id,
    name: row.name,
    score: row.score,
    level: row.level,
    date: typeof row.created_at === "string" ? Date.parse(row.created_at) : NaN,
  }));
  const scores = parseScores(mapped);
  if (scores.length !== mapped.length) throw new Error("The leaderboard returned an invalid score.");
  return scores;
}

export async function fetchSharedScores(signal?: AbortSignal): Promise<ScoreEntry[]> {
  const query = getClient().rpc("carecall_leaderboard");
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return decodeRows(data);
}

async function ensureGuestSession(): Promise<void> {
  if (signingIn) return signingIn;
  signingIn = (async () => {
    const db = getClient();
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (data.session) return;
    const result = await db.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error("A guest session could not be created.");
  })();
  try {
    await signingIn;
  } finally {
    signingIn = null;
  }
}

export async function submitSharedScore(entry: ScoreSubmission): Promise<ScoreEntry> {
  if (!validScore(entry.score, entry.level)) throw new Error("This score is not valid.");
  if (entry.startLevel !== 1) throw new Error("Shared leaderboard runs must start at shift 1.");
  await ensureGuestSession();
  const { data, error } = await getClient().rpc("carecall_submit_score", {
    p_run_id: entry.runId,
    p_name: normalizeName(entry.name),
    p_score: entry.score,
    p_level: entry.level,
    p_start_level: entry.startLevel,
  });
  if (error) throw error;
  const saved = decodeRows(data)[0];
  if (!saved) throw new Error("The database did not confirm the score was saved.");
  return saved;
}

export function leaderboardError(error: unknown): string {
  const detail = error && typeof error === "object" ? error as { code?: string; message?: string } : {};
  if (detail.message?.includes("RATE_LIMITED")) return "Please wait one minute between shared submissions, then retry.";
  if (detail.code === "anonymous_provider_disabled" || detail.message?.includes("Anonymous sign-ins are disabled")) {
    return "Online saving is not enabled by the game owner yet. Your local score is unaffected.";
  }
  if (detail.code === "PGRST202" || detail.code === "42501") return "The shared leaderboard needs database setup. Local scores still work.";
  if (detail.code === "22023" || detail.code === "23514") return "The database rejected this score. Local scores are unaffected.";
  if (detail.message?.includes("publishable key") || detail.message?.includes("secure database URL")) return detail.message;
  return "Could not reach the shared leaderboard. Check your connection and retry; local scores still work.";
}