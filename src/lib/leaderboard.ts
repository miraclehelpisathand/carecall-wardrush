import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeName, parseScores, validScore, type ScoreEntry, type ScoreSubmission } from "./highScores";
import { connectionState, reportConnection, validateCredentials, type ConnectionState } from "./connection";

let client: SupabaseClient | null = null;
let clientKey = "";
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

/** Build (or rebuild) the client for whatever credentials are active now. */
function getClient(): SupabaseClient {
  const { credentials } = connectionState();
  if (!credentials) throw new Error("The shared leaderboard is not connected yet.");
  const problem = validateCredentials(credentials.url, credentials.key);
  if (problem) throw new Error(problem);

  const identity = `${credentials.url}|${credentials.key}`;
  if (client && clientKey === identity) return client;

  client = createClient(credentials.url, credentials.key, {
    auth: {
      detectSessionInUrl: false,
      storageKey: `carecall.leaderboard.auth.${new URL(credentials.url).hostname}`,
    },
    global: { fetch: timedFetch },
  });
  clientKey = identity;
  signingIn = null;
  return client;
}

/** Drop the cached client after the owner changes the connection. */
export function resetLeaderboardClient() {
  client = null;
  clientKey = "";
  signingIn = null;
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
  const task = (async () => {
    const db = getClient();
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (data.session) return;
    const result = await db.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error("A guest session could not be created.");
  })();
  signingIn = task;
  try {
    await task;
  } finally {
    if (signingIn === task) signingIn = null;
  }
}

export async function submitSharedScore(entry: ScoreSubmission): Promise<ScoreEntry> {
  if (!validScore(entry.score, entry.level)) throw new Error("This score is not valid.");
  // Every run competes — the board ranks by score alone, wherever the run began.
  await ensureGuestSession();
  const { data, error } = await getClient().rpc("carecall_submit_score", {
    p_run_id: entry.runId,
    p_name: normalizeName(entry.name),
    p_score: entry.score,
    p_level: entry.level,
    p_start_level: entry.startLevel,
  });
  if (error) {
    const failure = diagnose(error);
    // A rejected score is not a connection problem; only report real outages.
    if (failure.hint !== "none") reportConnection(false, failure);
    throw error;
  }
  const saved = decodeRows(data)[0];
  if (!saved) throw new Error("The database did not confirm the score was saved.");
  reportConnection(true);
  return saved;
}

interface Failure {
  message: string;
  hint: ConnectionState["hint"];
}

/** Translate raw Supabase/network errors into a fix the owner can act on. */
export function diagnose(error: unknown): Failure {
  const detail = error && typeof error === "object" ? error as { code?: string; message?: string; hint?: string } : {};
  const text = `${detail.message || ""} ${detail.hint || ""}`;

  if (text.includes("RATE_LIMITED")) {
    return { message: "Please wait one minute between submissions, then retry.", hint: "none" };
  }
  if (text.includes("BELOW_CUTOFF")) {
    return { message: "This run did not reach the top 20.", hint: "none" };
  }
  if (detail.code === "anonymous_provider_disabled" || /anonymous sign-?ins? (are|is) disabled/i.test(text)) {
    return {
      message: "Guest submissions are switched off in Supabase. Enable Authentication → Providers → Anonymous Sign-Ins.",
      hint: "enable-anon",
    };
  }
  if (detail.code === "PGRST202" || detail.code === "42P01" || /could not find the function|schema cache/i.test(text)) {
    return {
      message: "The database tables are missing. Run supabase/migrations/202611070001_carecall_leaderboard.sql in the Supabase SQL Editor.",
      hint: "run-sql",
    };
  }
  if (detail.code === "42501" || /permission denied/i.test(text)) {
    return { message: "The database rejected access. Re-run the leaderboard SQL migration to restore its permissions.", hint: "run-sql" };
  }
  if (/invalid api key|no api key found|apikey/i.test(text)) {
    return { message: "Supabase rejected the publishable key. Copy it again from Project Settings → API Keys.", hint: "check-key" };
  }
  if (/Failed to fetch|NetworkError|ERR_|AbortError|aborted|load failed/i.test(text) || error instanceof TypeError) {
    return { message: "Could not reach Supabase. Check the Project URL and your internet connection.", hint: "network" };
  }
  if (detail.code === "22023" || detail.code === "23514") {
    return { message: "The database rejected this score. Local scores are unaffected.", hint: "none" };
  }
  if (/^5\d\d$/.test(String(detail.code)) || /\b50[234]\b|bad gateway|service unavailable|gateway timeout/i.test(text)) {
    return { message: "The leaderboard service is unavailable right now. Your score is kept — press RETRY shortly.", hint: "network" };
  }
  // Only surface a server string if it actually reads as a sentence; opaque
  // payloads like "{}" or a bare code must never reach the player.
  const raw = typeof detail.message === "string" ? detail.message.trim() : "";
  const readable = raw.length >= 12 && /[a-z]{3}/i.test(raw) && !/^[{[]/.test(raw) && !/^[\d\W]+$/.test(raw);
  if (readable) return { message: raw, hint: "network" };
  return { message: "Could not reach the shared leaderboard. Your score is kept — press RETRY to send it.", hint: "network" };
}

export function leaderboardError(error: unknown): string {
  return diagnose(error).message;
}

/** Read-only probe used by the Connect panel; reports status either way. */
export async function testConnection(): Promise<{ ok: boolean; message: string; hint: ConnectionState["hint"] }> {
  try {
    const scores = await fetchSharedScores();
    reportConnection(true);
    return {
      ok: true,
      message: scores.length
        ? `Connected. ${scores.length} shared ${scores.length === 1 ? "score" : "scores"} loaded.`
        : "Connected. The leaderboard is empty — finish a run to add the first score.",
      hint: "none",
    };
  } catch (error) {
    const failure = diagnose(error);
    reportConnection(false, failure);
    return { ok: false, message: failure.message, hint: failure.hint };
  }
}
