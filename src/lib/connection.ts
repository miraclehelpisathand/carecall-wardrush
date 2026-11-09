/**
 * Runtime leaderboard connection.
 *
 * Previously the Supabase URL/key were compiled into the bundle from
 * `import.meta.env`. That meant adding GitHub variables did nothing until the
 * site was rebuilt, and a prebuilt package could never be connected at all.
 *
 * Configuration is now resolved at RUNTIME, highest priority first:
 *   1. Owner override saved in this browser (Connect panel)
 *   2. ?supabase_url= / ?supabase_key= query parameters
 *   3. leaderboard-config.json sitting next to index.html (editable after deploy)
 *   4. VITE_* build variables (still supported)
 *
 * Only a publishable/anon key is ever accepted here — never a secret key.
 */

export type ConnectionSource = "override" | "query" | "file" | "build" | "none";
export type ConnectionPhase = "idle" | "checking" | "online" | "offline" | "misconfigured";

export interface Credentials {
  url: string;
  key: string;
}

export interface ConnectionState {
  phase: ConnectionPhase;
  source: ConnectionSource;
  credentials: Credentials | null;
  /** Human-readable explanation of the current phase. */
  detail: string;
  /** Machine-readable next action, used to tailor the setup panel. */
  hint: "none" | "add-config" | "run-sql" | "enable-anon" | "check-key" | "network";
  checkedAt: number | null;
}

const OVERRIDE_KEY = "carecall.leaderboard.config.v1";
const SHARE_KEY = "carecall.leaderboard.share.v1";

const buildUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const buildKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

let state: ConnectionState = {
  phase: "idle",
  source: "none",
  credentials: null,
  detail: "Checking leaderboard connection…",
  hint: "none",
  checkedAt: null,
};

const listeners = new Set<(next: ConnectionState) => void>();

function emit(next: ConnectionState) {
  state = next;
  for (const listener of listeners) listener(next);
}

export function connectionState(): ConnectionState {
  return state;
}

export function subscribeConnection(listener: (next: ConnectionState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
}

/** Reject secret/service-role keys and malformed URLs before they are used. */
export function validateCredentials(url: string, key: string): string | null {
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();
  if (!trimmedUrl) return "Enter your Supabase Project URL.";
  if (!trimmedKey) return "Enter your Supabase publishable key.";

  let endpoint: URL;
  try {
    endpoint = new URL(trimmedUrl);
  } catch {
    return "That Project URL is not a valid address. It looks like https://xxxx.supabase.co";
  }
  const local = endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !local) return "The Project URL must start with https://";
  if (endpoint.pathname.replace(/\/+$/, "") !== "") return "Use the project root URL only, without /rest/v1 or a trailing path.";

  if (trimmedKey.startsWith("sb_secret_")) return "That is a SECRET key. Use the publishable key instead — secret keys must never go in a browser.";
  if (trimmedKey.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(atob(trimmedKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role === "service_role") return "That is a SERVICE-ROLE key. Use the publishable/anon key instead.";
      if (payload.role !== "anon") return "That key is not a publishable/anon key.";
    } catch {
      return "That key could not be read. Copy the publishable key again.";
    }
    return null;
  }
  if (!trimmedKey.startsWith("sb_publishable_")) return "That does not look like a publishable key. It should start with sb_publishable_";
  return null;
}

function readOverride(): Credentials | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (typeof parsed?.url !== "string" || typeof parsed?.key !== "string") return null;
    if (validateCredentials(parsed.url, parsed.key)) return null;
    return { url: parsed.url.trim(), key: parsed.key.trim() };
  } catch {
    return null;
  }
}

export function saveOverride(url: string, key: string): string | null {
  const problem = validateCredentials(url, key);
  if (problem) return problem;
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
  } catch {
    return "This browser is blocking storage, so the connection cannot be remembered.";
  }
  return null;
}

export function clearOverride() {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch { /* ignore */ }
}

export function hasOverride(): boolean {
  return readOverride() !== null;
}

/** Remember whether this player wants scores published. */
export function sharePreference(fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(SHARE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch { /* ignore */ }
  return fallback;
}

export function setSharePreference(value: boolean) {
  try {
    localStorage.setItem(SHARE_KEY, value ? "1" : "0");
  } catch { /* ignore */ }
}

function fromQuery(): Credentials | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("supabase_url");
    const key = params.get("supabase_key");
    if (!url || !key) return null;
    if (validateCredentials(url, key)) return null;
    return { url: url.trim(), key: key.trim() };
  } catch {
    return null;
  }
}

async function fromConfigFile(signal?: AbortSignal): Promise<Credentials | null> {
  try {
    // Relative so it works at / and at /repo-name/ on GitHub Pages.
    const response = await fetch("leaderboard-config.json", { cache: "no-store", signal });
    if (!response.ok) return null;
    const text = await response.text();
    // A single-page-app host may answer with index.html; ignore that.
    if (text.trimStart().startsWith("<")) return null;
    const parsed = JSON.parse(text) as Partial<Credentials>;
    if (typeof parsed?.url !== "string" || typeof parsed?.key !== "string") return null;
    if (!parsed.url.trim() || !parsed.key.trim()) return null;
    if (validateCredentials(parsed.url, parsed.key)) return null;
    return { url: parsed.url.trim(), key: parsed.key.trim() };
  } catch {
    return null;
  }
}

let resolving: Promise<ConnectionState> | null = null;

/** Resolve credentials from every source. Safe to call repeatedly. */
export function resolveConnection(force = false): Promise<ConnectionState> {
  if (resolving && !force) return resolving;
  const task = (async () => {
    const override = readOverride();
    if (override) return commit(override, "override");

    const query = fromQuery();
    if (query) return commit(query, "query");

    const file = await fromConfigFile();
    if (file) return commit(file, "file");

    if (buildUrl && buildKey && !validateCredentials(buildUrl, buildKey)) {
      return commit({ url: buildUrl, key: buildKey }, "build");
    }

    emit({
      phase: "idle",
      source: "none",
      credentials: null,
      detail: "Not connected. Scores are saved on this device only.",
      hint: "add-config",
      checkedAt: Date.now(),
    });
    return state;
  })();
  resolving = task;
  // Clear the slot only once the work has actually settled.
  void task.finally(() => {
    if (resolving === task) resolving = null;
  });
  return task;
}

function commit(credentials: Credentials, source: ConnectionSource): ConnectionState {
  emit({
    phase: "checking",
    source,
    credentials,
    detail: "Connecting to the shared leaderboard…",
    hint: "none",
    checkedAt: null,
  });
  return state;
}

/** Called by the leaderboard hook once a read attempt succeeds or fails. */
export function reportConnection(
  ok: boolean,
  info?: { detail?: string; hint?: ConnectionState["hint"] },
) {
  if (ok) {
    emit({ ...state, phase: "online", detail: "Connected — shared scores are live.", hint: "none", checkedAt: Date.now() });
    return;
  }
  emit({
    ...state,
    phase: state.credentials ? (info?.hint === "run-sql" || info?.hint === "check-key" ? "misconfigured" : "offline") : "idle",
    detail: info?.detail || "Could not reach the shared leaderboard.",
    hint: info?.hint || "network",
    checkedAt: Date.now(),
  });
}

export function describeSource(source: ConnectionSource): string {
  switch (source) {
    case "override": return "Saved in this browser";
    case "query": return "From the page address";
    case "file": return "leaderboard-config.json";
    case "build": return "Build settings";
    default: return "Not set";
  }
}
