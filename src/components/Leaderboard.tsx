import { useEffect, useRef, useState } from "react";
import type { SharedLeaderboardState } from "../hooks/useSharedLeaderboard";
import { SCORE_LIMIT } from "../lib/highScores";
import { isSeedId } from "../lib/seedScores";
import LeaderboardSetup from "./LeaderboardSetup";

export const MEDAL = ["#ffd24a", "#cfe0ec", "#e09a5a"];

export function Status({ shared }: { shared: SharedLeaderboardState }) {
  const phase = shared.connection.phase;
  const busy = phase === "checking" || shared.loading;
  const tone = shared.online ? "#25e07a" : busy ? "#ffb020" : phase === "idle" ? "#5b7186" : "#ff2f4f";
  const label = shared.online ? "LIVE" : busy ? "SYNC" : phase === "idle" ? "LOCAL" : "RETRY";
  return (
    <span className="flex shrink-0 items-center gap-1" title={shared.connection.detail}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${shared.online ? "" : "cc-pulse"}`}
        style={{ background: tone, boxShadow: `0 0 7px ${tone}` }}
      />
      <span className="font-mono text-[8px] tracking-widest" style={{ color: tone }}>{label}</span>
    </span>
  );
}

export default function Leaderboard({
  shared,
  highlightId,
  limit,
  onExpand,
}: {
  shared: SharedLeaderboardState;
  highlightId?: string | null;
  /** Show only the leading places, with a link through to the full board. */
  limit?: number;
  onExpand?: () => void;
}) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [moreBelow, setMoreBelow] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const board = limit ? shared.board.slice(0, limit) : shared.board;
  const compact = Boolean(limit);

  // Bring the player's own new entry into view without scrolling the page.
  useEffect(() => {
    if (!highlightId || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-run="${highlightId}"]`);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightId, board]);

  // Show a fade + cue only while there are places still out of view.
  useEffect(() => {
    const el = listRef.current;
    if (!el || compact) {
      setMoreBelow(false);
      return;
    }
    const measure = () => setMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 6);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [board, compact]);

  return (
    <section
      className="cc-panel relative flex min-h-0 min-w-0 flex-col rounded-xl p-2.5"
      aria-label={compact ? `Top ${limit} scores` : `Top ${SCORE_LIMIT} scores`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-cyan-300">
          {compact ? `TOP ${limit} · WARD LEADERS` : `TOP ${SCORE_LIMIT} · ALL PLAYERS`}
          <Status shared={shared} />
        </h2>
        {!compact && (
          <span className="shrink-0 font-mono text-[10px] text-slate-500">{board.length}/{SCORE_LIMIT}</span>
        )}
      </div>

      {shared.error && (
        <div className="mb-2 rounded-lg border border-amber-400/25 bg-amber-400/5 px-2.5 py-2">
          <p role="status" className="text-[11px] leading-snug text-amber-200">{shared.error}</p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              disabled={shared.loading}
              onClick={() => void shared.refresh()}
              aria-label="Reload the leaderboard"
              className="cc-btn min-h-9 flex-1 rounded-lg bg-amber-400/15 px-2 text-[10px] font-bold tracking-widest text-amber-200 disabled:opacity-50"
            >
              {shared.loading ? "RELOADING…" : "RELOAD"}
            </button>
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="cc-btn min-h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] tracking-widest text-slate-300"
            >
              FIX SETUP
            </button>
          </div>
        </div>
      )}

      {shared.usingSeed && !shared.error && !compact && (
        <p className="mb-2 rounded-md bg-cyan-400/[0.07] px-2 py-1 text-[10px] leading-snug text-cyan-200/80">
          {shared.configured
            ? "Opening board — connecting for live scores…"
            : "Opening board. Beat these to claim a place."}
        </p>
      )}

      <div className="relative min-h-0">
        <ol
          ref={listRef}
          className={`cc-scroll -mr-1 flex min-h-0 flex-col pr-1 ${
            compact ? "gap-1" : "max-h-[min(46vh,340px)] gap-0.5 overflow-y-auto"
          }`}
        >
          {board.map((score, i) => {
            const mine = Boolean(highlightId && score.id === highlightId);
            const medal = MEDAL[i];
            if (compact) {
              return (
                <li
                  key={score.id || `${score.date}-${i}`}
                  data-run={score.id}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 ${
                    mine ? "bg-amber-400/20 ring-1 ring-amber-300/50" : "bg-black/35"
                  }`}
                  style={medal ? { boxShadow: `inset 3px 0 0 ${medal}` } : undefined}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[12px] font-bold"
                    style={{
                      color: medal ?? "#8ba3b8",
                      background: medal ? `${medal}1f` : "rgba(255,255,255,0.05)",
                      boxShadow: medal ? `0 0 12px -4px ${medal}` : undefined,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-mono text-[13px] leading-tight ${mine ? "text-amber-100" : "text-slate-100"}`}>
                      {score.name}
                      {mine && <span className="ml-1 text-[9px] tracking-widest text-amber-300">YOU</span>}
                    </span>
                    <span className="block text-[9px] tracking-[0.18em] text-slate-500">SHIFT {score.level}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[15px] leading-none" style={{ color: medal ?? "#ffb020" }}>
                    {score.score.toLocaleString()}
                  </span>
                </li>
              );
            }
            return (
              <li
                key={score.id || `${score.date}-${i}`}
                data-run={score.id}
                className={`flex items-center gap-2 rounded px-1.5 py-1 font-mono text-xs transition-colors ${
                  mine ? "bg-amber-400/20 ring-1 ring-amber-300/50" : i % 2 ? "bg-white/[0.03]" : ""
                }`}
              >
                <span className="w-5 shrink-0 text-right text-[11px] font-bold" style={{ color: medal ?? "#64798c" }}>
                  {i + 1}
                </span>
                <span className={`min-w-0 flex-1 truncate ${mine ? "text-amber-100" : "text-slate-200"}`}>
                  {score.name}
                  {mine && <span className="ml-1 text-[9px] tracking-widest text-amber-300">YOU</span>}
                  {!mine && isSeedId(score.id) && <span className="ml-1 text-[9px] text-slate-600">·</span>}
                </span>
                <span className={mine ? "text-amber-200" : "text-amber-300/90"}>{score.score.toLocaleString()}</span>
                <span className="w-12 shrink-0 text-right text-[10px] text-slate-500">S{score.level}</span>
              </li>
            );
          })}
        </ol>
        {moreBelow && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#080f18] to-transparent" />
            <button
              type="button"
              onClick={() => listRef.current?.scrollBy({ top: 160, behavior: "smooth" })}
              className="cc-btn absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-bold tracking-widest text-cyan-200"
            >
              MORE ▾
            </button>
          </>
        )}
      </div>

      {compact && onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="cc-btn group mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 text-[10px] font-bold tracking-[0.18em] text-cyan-200"
        >
          SEE ALL {SCORE_LIMIT} SCORES
          <span className="transition-transform group-hover:translate-x-0.5">▸</span>
        </button>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-1.5 text-[10px] text-slate-500">
        <span className="min-w-0 truncate">
          {shared.cutoff > 0 ? `Beat ${shared.cutoff.toLocaleString()} to place` : "Board has open places"}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {shared.configured && !compact && (
            <button
              type="button"
              disabled={shared.loading}
              onClick={() => void shared.refresh()}
              className="cc-btn min-h-9 px-1 text-cyan-300 disabled:opacity-40"
            >
              {shared.loading ? "…" : "REFRESH"}
            </button>
          )}
          {!compact && (
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              title="Leaderboard connection"
              className="cc-btn min-h-9 px-1 text-slate-500 hover:text-cyan-300"
            >
              SETUP
            </button>
          )}
        </div>
      </div>

      {setupOpen && (
        <LeaderboardSetup
          connection={shared.connection}
          onClose={() => setSetupOpen(false)}
          onReconnect={shared.reconnect}
          onRefresh={shared.refresh}
        />
      )}
    </section>
  );
}
