import { CALL_META } from "../game/constants";
import type { Hud } from "../game/engine";
import type { SharedLeaderboardState } from "../hooks/useSharedLeaderboard";
import type { ScoreSaveResult } from "../lib/highScores";
import Leaderboard from "./Leaderboard";
import ScoreEntryForm from "./ScoreEntryForm";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex items-center ${small ? "gap-2" : "gap-3"}`}>
      <div
        className={`relative shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00AEEF] to-[#0E6E9A] shadow-[0_0_22px_rgba(0,174,239,0.45)] ${
          small ? "flex h-9 w-9" : "flex h-11 w-11"
        }`}
      >
        <span className={`font-bold leading-none text-white ${small ? "text-xl" : "text-2xl"}`}>✚</span>
      </div>
      <div className={`font-bold tracking-wide text-white ${small ? "text-lg" : "text-2xl sm:text-3xl"}`}>
        Care<span className="text-[#00AEEF]">Call</span>{" "}
        <span className="text-white">Ward</span>
        <span className="text-[#00AEEF]">Rush</span>
      </div>
    </div>
  );
}

export function Overlay({ children, dim = true }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      style={{
        touchAction: "pan-y",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "max(10px, env(safe-area-inset-left))",
        paddingRight: "max(10px, env(safe-area-inset-right))",
      }}
      className={`absolute inset-0 z-30 overflow-y-auto overscroll-contain ${
        dim ? "bg-[#03070d]/85 backdrop-blur-sm" : ""
      }`}
    >
      {/*
        The inner wrapper grows to the content height, so a panel taller than the
        viewport is centered inside that grown box — no clipped top edge, which is
        what plain flex centering on a scroll container does.
      */}
      <div className="flex min-h-full w-full items-center justify-center">{children}</div>
    </div>
  );
}

function LegendTile({ kind, desc }: { kind: keyof typeof CALL_META; desc: string }) {
  const m = CALL_META[kind];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/40 px-2 py-1.5">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold leading-tight tracking-wider" style={{ color: m.color }}>
          {m.label}
        </div>
        <div className="truncate text-[10px] leading-tight text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

export function StartScreen({
  onStart,
  onShowScores,
  shared,
  unlocked,
  startLevel,
  setStartLevel,
}: {
  onStart: () => void;
  onShowScores: () => void;
  shared: SharedLeaderboardState;
  unlocked: number;
  startLevel: number;
  setStartLevel: (n: number) => void;
}) {
  return (
    <Overlay>
      <div className="w-full max-w-4xl">
        <div className="cc-panel cc-scan relative overflow-hidden rounded-2xl p-3 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Logo />
              <div className="text-right text-[10px] leading-tight tracking-widest text-slate-500">
                50 SHIFTS · 3 LIVES
                <br />
                NURSE CALL RESPONSE SIM
              </div>
            </div>

            {/* two columns from 640px so a landscape phone sees START without scrolling */}
            <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr] sm:gap-4">
              <div className="flex flex-col gap-3">
                <p className="cc-short-hide hidden text-sm leading-relaxed text-slate-300 sm:block">
                  You're the nurse on shift. Calls light up the <span className="text-cyan-300">annunciator</span> and the
                  over-door lamps. Sprint to the room, hold at the call point to reset it — before the timer runs out.
                  Miss a call and you lose a life. Clear every call, then return to the{" "}
                  <span className="text-emerald-300">nurses station</span> to end the shift.
                </p>
                <p className="cc-short-only text-[12px] leading-snug text-slate-400">
                  Answer every call before it times out, then return to the station to finish the shift.
                </p>
                <div className="cc-short-hide grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <LegendTile kind="emergency" desc="Highest priority. Very short fuse." />
                  <LegendTile kind="patient" desc="Standard bedside call." />
                  <LegendTile kind="assist" desc="Colleague needs a hand." />
                  <LegendTile kind="keys" desc="Grab keys from the station first." />
                </div>
                <div className="cc-short-hide grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 sm:grid-cols-4">
                  <div className="rounded-lg bg-black/40 px-2 py-1.5">
                    <div className="font-bold text-cyan-200">MOVE</div>WASD / Arrows / drag left
                  </div>
                  <div className="rounded-lg bg-black/40 px-2 py-1.5">
                    <div className="font-bold text-cyan-200">DASH</div>Space / tap right
                  </div>
                  <div className="rounded-lg bg-black/40 px-2 py-1.5">
                    <div className="font-bold text-cyan-200">PAUSE</div>Esc / P
                  </div>
                  <div className="rounded-lg bg-black/40 px-2 py-1.5">
                    <div className="font-bold text-rose-300">AVOID</div>Rolling beds &amp; residents
                  </div>
                </div>
                <div className="cc-short-only flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>
                    <b className="text-cyan-200">MOVE</b> drag
                  </span>
                  <span>
                    <b className="text-cyan-200">DASH</b> tap
                  </span>
                  <span>
                    <b className="text-rose-300">AVOID</b> beds &amp; residents
                  </span>
                  <span className="text-slate-500">Esc = pause</span>
                </div>
                <div className="cc-short-hide rounded-lg border border-amber-400/20 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-snug text-amber-200/90">
                  <b>Later shifts:</b> 🍽️ meal calls need a tray from the pantry (slows you down) · 🚻 toilet assists must be
                  escorted to the WC · 🔑 key calls need the key ring · lights go down on evening &amp; night shifts.
                </div>
                <div className="cc-short-hide rounded-lg border border-yellow-400/25 bg-yellow-400/5 px-2.5 py-2 text-[11px] leading-snug text-yellow-200/90">
                  <b>🧹 Accidents:</b> if an escort doesn't reach the WC in time there's a spill. Grab the{" "}
                  <b>mop from the nurses station</b> and stand over it to clean up for points — sprint through an
                  uncleaned spill and you'll slip. Leftover spills cost you shift bonus.
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="cc-panel rounded-xl p-3">
                  <div className="mb-1 text-[10px] tracking-[0.22em] text-slate-500">START AT SHIFT</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStartLevel(Math.max(1, startLevel - 1))}
                      className="cc-btn h-9 w-9 rounded-lg bg-white/5 text-lg text-cyan-200"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <div className="font-mono text-3xl leading-none text-white">{startLevel}</div>
                      <div className="text-[9px] tracking-widest text-slate-500">UNLOCKED 1–{unlocked}</div>
                    </div>
                    <button
                      onClick={() => setStartLevel(Math.min(unlocked, startLevel + 1))}
                      className="cc-btn h-9 w-9 rounded-lg bg-white/5 text-lg text-cyan-200"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={onStart}
                  className="cc-btn group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3.5 text-lg font-bold tracking-[0.2em] text-[#04202b] shadow-[0_0_30px_rgba(34,211,238,0.35)]"
                >
                  START SHIFT ▸
                </button>
                <Leaderboard shared={shared} limit={3} onExpand={onShowScores} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

export function PauseScreen({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <Overlay>
      <div className="cc-panel w-full max-w-sm rounded-2xl p-5 text-center">
        <div className="text-[11px] tracking-[0.3em] text-cyan-300">SHIFT PAUSED</div>
        <div className="mt-1 text-3xl font-bold tracking-wide text-white">BREAK ROOM</div>
        <p className="mt-2 text-xs text-slate-400">Calls are on hold. The residents are not.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onResume}
            className="cc-btn rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3 font-bold tracking-[0.18em] text-[#04202b]"
          >
            RESUME
          </button>
          <button onClick={onQuit} className="cc-btn rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm tracking-widest text-slate-300">
            END SHIFT
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function LevelCompleteScreen({ hud, onNext, countdown }: { hud: Hud; onNext: () => void; countdown: number }) {
  const s = hud.stats;
  return (
    <Overlay>
      <div className="cc-panel cc-pop w-full max-w-md rounded-2xl p-5">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.3em] text-emerald-300">SHIFT {hud.level} COMPLETE</div>
          <div className="mt-1 text-3xl font-bold tracking-wide text-white">HANDOVER DONE</div>
        </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-black/40 py-2">
              <div className="font-mono text-xl text-emerald-300">{s.cleared}</div>
              <div className="text-[9px] tracking-widest text-slate-500">CLEARED</div>
            </div>
            <div className="rounded-lg bg-black/40 py-2">
              <div className="font-mono text-xl text-rose-300">{s.missed}</div>
              <div className="text-[9px] tracking-widest text-slate-500">MISSED</div>
            </div>
            <div className="rounded-lg bg-black/40 py-2">
              <div className="font-mono text-xl text-yellow-200">{s.cleaned}</div>
              <div className="text-[9px] tracking-widest text-slate-500">MOPPED</div>
            </div>
            <div className="rounded-lg bg-black/40 py-2">
              <div className="font-mono text-xl text-amber-300">x{hud.mult.toFixed(1)}</div>
              <div className="text-[9px] tracking-widest text-slate-500">COMBO</div>
            </div>
          </div>
        <div className="mt-3 space-y-1 rounded-lg bg-black/30 p-2.5 font-mono text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">SHIFT BONUS</span>
            <span className="text-emerald-300">+{s.bonus.toLocaleString()}</span>
          </div>
          {s.perfect && (
            <div className="flex justify-between">
              <span className="text-slate-500">PERFECT SHIFT</span>
              <span className="text-amber-300">NO MISSED CALLS</span>
            </div>
          )}
          {hud.level % 10 === 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">MILESTONE</span>
              <span className="text-rose-300">+1 LIFE ❤️</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-white/10 pt-1.5 text-base">
            <span className="text-slate-400">TOTAL</span>
            <span className="text-amber-300">{hud.score.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={onNext}
          className="cc-btn mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3 font-bold tracking-[0.18em] text-[#04202b]"
        >
          NEXT SHIFT ▸ <span className="font-mono text-xs opacity-70">({countdown})</span>
        </button>
      </div>
    </Overlay>
  );
}

export function GameOverScreen({
  hud,
  shared,
  qualifies,
  rank,
  practice,
  highlightId,
  onSubmit,
  onRestart,
  onRetry,
  onMenu,
  victory,
}: {
  hud: Hud;
  shared: SharedLeaderboardState;
  qualifies: boolean;
  rank: number | null;
  practice: boolean;
  highlightId: string | null;
  onSubmit: (name: string) => Promise<ScoreSaveResult>;
  onRestart: () => void;
  onRetry: () => void;
  onMenu: () => void;
  victory: boolean;
}) {
  return (
    <Overlay>
      <div className="w-full max-w-2xl">
        <div className="cc-panel cc-pop rounded-2xl p-5">
          <div className="text-center">
            <div className={`text-[11px] tracking-[0.3em] ${victory ? "text-emerald-300" : "text-rose-400"}`}>
              {victory ? "ALL 50 SHIFTS SURVIVED" : "SHIFT ENDED"}
            </div>
            <div className="mt-1 text-4xl font-bold tracking-wide text-white cc-shadow-text">
              {victory ? "LEGENDARY NURSE" : "CALLS UNANSWERED"}
            </div>
            <div className="mt-3 font-mono text-5xl leading-none text-amber-300">{hud.score.toLocaleString()}</div>
            <div className="mt-1 text-[10px] tracking-[0.25em] text-slate-500">FINAL SCORE</div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["SHIFT", `${hud.level}`, "text-cyan-200"],
              ["CLEARED", `${hud.totals.cleared}`, "text-emerald-300"],
              ["MISSED", `${hud.totals.missed}`, "text-rose-300"],
              ["BEST COMBO", `${hud.totals.bestCombo}`, "text-amber-300"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-lg bg-black/40 py-2">
                <div className={`font-mono text-lg ${c}`}>{v}</div>
                <div className="text-[9px] tracking-widest text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              {hud.score > 0 && (
                <ScoreEntryForm
                  qualifies={qualifies}
                  rank={rank}
                  canSubmit={shared.configured}
                  practice={practice}
                  onSave={onSubmit}
                />
              )}
              <button
                onClick={onRetry}
                className="cc-btn rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3 font-bold tracking-[0.18em] text-[#04202b]"
              >
                {victory ? "PLAY AGAIN ⟲" : `RETRY SHIFT ${hud.level} ⟲`}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onRestart}
                  className="cc-btn flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs tracking-widest text-slate-300"
                >
                  NEW RUN
                </button>
                <button
                  onClick={onMenu}
                  className="cc-btn flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs tracking-widest text-slate-300"
                >
                  MAIN MENU
                </button>
              </div>
              <div className="text-center text-[10px] tracking-widest text-slate-600">PRESS ENTER TO RETRY</div>
            </div>
            <Leaderboard shared={shared} highlightId={highlightId} />
          </div>
        </div>
      </div>
    </Overlay>
  );
}

export function Banner({ hud, offset = 8 }: { hud: Hud; offset?: number }) {
  const brief = hud.phase === "briefing";
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[21] flex flex-col items-center gap-1.5 px-2"
      style={{ top: offset }}
    >
      {brief && (
        <div className="cc-pop flex flex-col items-center">
          <div className="text-[11px] tracking-[0.35em] text-cyan-300">{hud.wardName}</div>
          <div className="text-5xl font-bold tracking-wider text-white cc-shadow-text">SHIFT {hud.level}</div>
          <div className="mt-1 rounded-full bg-black/50 px-3 py-1 text-[11px] tracking-[0.25em] text-amber-300">
            {hud.shift.toUpperCase()} · STARTING IN {Math.max(0, Math.ceil(hud.briefT))}
          </div>
        </div>
      )}
      {!brief && hud.toast && (
        <div
          key={hud.toast.text}
          className="cc-rise rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.18em] backdrop-blur-sm"
          style={{
            color: hud.toast.color,
            borderColor: `${hud.toast.color}55`,
            background: "rgba(4,10,16,0.72)",
            boxShadow: `0 0 24px -6px ${hud.toast.color}`,
          }}
        >
          {hud.toast.text}
        </div>
      )}
      {hud.phase === "allclear" && (
        <div className="cc-pulse rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-emerald-300">
          RETURN TO THE NURSES STATION ▸
        </div>
      )}
    </div>
  );
}
