import { useState } from "react";
import type { SharedLeaderboardState } from "../hooks/useSharedLeaderboard";
import type { ScoreEntry } from "../lib/highScores";

export default function Leaderboard({
  localScores,
  shared,
}: {
  localScores: ScoreEntry[];
  shared: SharedLeaderboardState;
}) {
  const [view, setView] = useState<"local" | "shared">("local");
  const online = view === "shared";
  const scores = online ? shared.scores : localScores;

  return (
    <section className="cc-panel min-w-0 rounded-xl p-2.5" aria-label="High scores">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-300">TOP SHIFTS</h2>
        <div className="flex rounded-md bg-black/40 p-0.5" role="group" aria-label="Leaderboard source">
          {(["local", "shared"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={view === tab}
              disabled={tab === "shared" && !shared.configured}
              onClick={() => setView(tab)}
              title={tab === "shared" && !shared.configured ? "The shared leaderboard is not connected yet" : undefined}
              className={`cc-btn min-h-9 rounded px-2 text-[9px] font-bold tracking-widest disabled:cursor-not-allowed disabled:opacity-30 ${
                view === tab ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500"
              }`}
            >
              {tab === "local" ? "MY DEVICE" : "EVERYONE"}
            </button>
          ))}
        </div>
      </div>

      {online && shared.error && (
        <p role="status" className="mb-2 text-[11px] leading-snug text-amber-200">{shared.error}</p>
      )}
      {scores.length === 0 ? (
        <p className="py-3 text-center text-[11px] tracking-widest text-slate-500" role="status">
          {online && shared.loading ? "LOADING SCORES..." : online && shared.error ? "SHARED SCORES UNAVAILABLE" : "NO RECORDS YET"}
        </p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {scores.map((score, i) => (
            <li key={score.id || `${score.date}-${i}`} className={`flex items-center gap-2 rounded px-1.5 py-1 font-mono text-xs ${i % 2 ? "bg-white/[0.03]" : ""}`}>
              <span className="w-4 shrink-0 text-slate-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{score.name}</span>
              <span className="text-amber-300">{score.score.toLocaleString()}</span>
              <span className="w-14 shrink-0 text-right text-[10px] text-slate-500">SHIFT {score.level}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-1.5 text-[10px] text-slate-500">
        <span>{online ? shared.error && scores.length ? "Last loaded shared scores" : "All players / runs from shift 1" : "Saved on this device"}</span>
        {online && (
          <button type="button" disabled={shared.loading} onClick={() => void shared.refresh()} className="cc-btn min-h-9 px-1 text-cyan-300 disabled:opacity-40">
            {shared.loading ? "UPDATING..." : "REFRESH"}
          </button>
        )}
      </div>
    </section>
  );
}