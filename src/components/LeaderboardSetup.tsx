import { useEffect, useState } from "react";
import {
  clearOverride, describeSource, hasOverride, saveOverride, validateCredentials, type ConnectionState,
} from "../lib/connection";
import { testConnection } from "../lib/leaderboard";

const SQL_PATH = "supabase/migrations/202611070001_carecall_leaderboard.sql";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 font-mono text-[10px] text-cyan-300">
        {n}
      </span>
      <div className="min-w-0 text-[11px] leading-snug text-slate-400">
        <span className="font-bold tracking-wide text-slate-200">{title}</span>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}

export default function LeaderboardSetup({
  connection,
  onClose,
  onReconnect,
  onRefresh,
}: {
  connection: ConnectionState;
  onClose: () => void;
  onReconnect: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [url, setUrl] = useState(connection.credentials?.url ?? "");
  const [key, setKey] = useState(connection.credentials?.key ?? "");
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedHere, setSavedHere] = useState(hasOverride);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const problem = url || key ? validateCredentials(url, key) : null;

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateCredentials(url, key);
    if (invalid) {
      setMessage({ ok: false, text: invalid });
      return;
    }
    setTesting(true);
    setMessage(null);
    const stored = saveOverride(url, key);
    if (stored) {
      setTesting(false);
      setMessage({ ok: false, text: stored });
      return;
    }
    setSavedHere(true);
    await onReconnect();
    const result = await testConnection();
    // Pull the real rows so the board behind this panel is no longer stale.
    if (result.ok) await onRefresh();
    setTesting(false);
    setMessage({ ok: result.ok, text: result.message });
  };

  const disconnect = async () => {
    clearOverride();
    setSavedHere(false);
    setUrl("");
    setKey("");
    setMessage({ ok: true, text: "Disconnected. Scores will be saved on this device only." });
    await onReconnect();
  };

  const retest = async () => {
    setTesting(true);
    setMessage(null);
    const result = await testConnection();
    if (result.ok) await onRefresh();
    setTesting(false);
    setMessage({ ok: result.ok, text: result.message });
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#03070d]/94 backdrop-blur-sm"
      style={{
        touchAction: "pan-y",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "max(10px, env(safe-area-inset-left))",
        paddingRight: "max(10px, env(safe-area-inset-right))",
      }}
      role="dialog"
      aria-label="Shared leaderboard setup"
    >
      <div className="flex min-h-full w-full items-center justify-center">
        <div className="cc-panel w-full max-w-lg rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-[0.28em] text-cyan-400">SHARED LEADERBOARD</div>
              <h2 className="mt-0.5 text-xl font-bold tracking-wide text-white">Connect Supabase</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close setup"
              className="cc-btn min-h-9 min-w-9 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] leading-snug">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Status</span>
              <span className={connection.phase === "online" ? "text-emerald-300" : connection.phase === "idle" ? "text-slate-300" : "text-amber-300"}>
                {connection.phase === "online" ? "Connected" : connection.phase === "checking" ? "Checking…" : connection.phase === "idle" ? "Not connected" : "Needs attention"}
              </span>
            </div>
            <p className="mt-1 text-slate-400">{connection.detail}</p>
            <p className="mt-1 text-slate-600">Settings source: {describeSource(connection.source)}</p>
          </div>

          <form onSubmit={(event) => void connect(event)} className="mt-3 flex flex-col gap-2">
            <label className="text-[10px] tracking-[0.18em] text-slate-500" htmlFor="sb-url">PROJECT URL</label>
            <input
              id="sb-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://xxxxxxxx.supabase.co"
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 rounded-lg border border-white/10 bg-black/50 px-2.5 font-mono text-[13px] text-cyan-100 outline-none focus:border-cyan-400/60"
            />
            <label className="mt-1 text-[10px] tracking-[0.18em] text-slate-500" htmlFor="sb-key">PUBLISHABLE KEY</label>
            <input
              id="sb-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="sb_publishable_…"
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 rounded-lg border border-white/10 bg-black/50 px-2.5 font-mono text-[13px] text-cyan-100 outline-none focus:border-cyan-400/60"
            />
            {problem && <p className="text-[11px] leading-snug text-amber-200">{problem}</p>}
            <p className="text-[10px] leading-snug text-slate-500">
              Never paste a secret or service-role key. This value is visible to anyone using the page.
            </p>

            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={testing}
                className="cc-btn min-h-11 flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 text-[11px] font-bold tracking-[0.16em] text-[#04202b] disabled:opacity-60"
              >
                {testing ? "TESTING…" : "CONNECT & TEST"}
              </button>
              {connection.credentials && (
                <button
                  type="button"
                  onClick={() => void retest()}
                  disabled={testing}
                  className="cc-btn min-h-11 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 text-[11px] font-bold tracking-widest text-cyan-200 disabled:opacity-60"
                >
                  RETEST
                </button>
              )}
              {savedHere && (
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={testing}
                  className="cc-btn min-h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] tracking-widest text-slate-300 disabled:opacity-60"
                >
                  DISCONNECT
                </button>
              )}
            </div>
          </form>

          {message && (
            <p role="status" className={`mt-2.5 rounded-lg px-2.5 py-2 text-[11px] leading-snug ${message.ok ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-200"}`}>
              {message.text}
            </p>
          )}

          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="text-[10px] tracking-[0.22em] text-slate-500">ONE-TIME DATABASE SETUP</div>
            <ol className="mt-2 flex flex-col gap-2">
              <Step n={1} title="Create a Supabase project">
                At supabase.com. Open <b className="text-slate-300">Connect</b> to copy the Project URL and publishable key.
              </Step>
              <Step n={2} title="Run the SQL migration">
                In <b className="text-slate-300">SQL Editor → New query</b>, paste the contents of
                <code className="mx-1 rounded bg-black/50 px-1 font-mono text-[10px] text-cyan-200">{SQL_PATH}</code>
                from the project download and press Run.
              </Step>
              <Step n={3} title="Allow guest submissions">
                <b className="text-slate-300">Authentication → Providers → Anonymous Sign-Ins</b> must be enabled, or publishing is refused.
              </Step>
              <Step n={4} title="Paste the values above">
                Connect &amp; Test verifies the database immediately — no rebuild needed.
              </Step>
            </ol>
            <p className="mt-2.5 text-[10px] leading-snug text-slate-500">
              Connecting here saves the settings <b className="text-slate-400">in this browser only</b>. To switch it on for every
              player, put the same values in <code className="rounded bg-black/50 px-1 font-mono text-cyan-200">public/leaderboard-config.json</code> and
              redeploy — that file is read at runtime, so it works without changing any code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
