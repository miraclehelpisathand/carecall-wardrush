import { useEffect, useRef, useState } from "react";
import { CALL_META } from "../game/constants";

import type { Hud } from "../game/engine";
import type { ScoreEntry } from "../hooks/useHighScores";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00AEEF] to-[#0E6E9A] shadow-[0_0_22px_rgba(0,174,239,0.45)]">
        <span className="text-2xl font-bold leading-none text-white">✚</span>
      </div>
      <div className={`font-bold tracking-wide text-white ${small ? "text-xl" : "text-3xl"}`}>
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
      style={{ touchAction: "pan-y" }}
      className={`absolute inset-0 z-30 flex items-center justify-center overflow-y-auto p-3 ${
        dim ? "bg-[#03070d]/85 backdrop-blur-sm" : ""
      }`}
    >
      {children}
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

export function ScoreTable({ scores, highlight }: { scores: ScoreEntry[]; highlight?: number }) {
  return (
    <div className="cc-panel rounded-xl p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">TOP SHIFTS</span>
        <span className="text-[9px] tracking-widest text-slate-600">LOCAL</span>
      </div>
      {scores.length === 0 ? (
        <div className="py-4 text-center text-[11px] tracking-widest text-slate-600">NO RECORDS YET</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {scores.map((s, i) => (
            <div
              key={`${s.date}-${i}`}
              className={`flex items-center gap-2 rounded px-1.5 py-1 font-mono text-[12px] ${
                highlight === s.date ? "bg-amber-400/20 text-amber-200" : i % 2 ? "bg-white/[0.03]" : ""
              }`}
            >
              <span className="w-4 text-slate-500">{i + 1}</span>
              <span className="w-16 truncate text-slate-200">{s.name}</span>
              <span className="ml-auto text-amber-300">{s.score.toLocaleString()}</span>
              <span className="w-14 text-right text-[10px] text-slate-500">SHIFT {s.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StartScreen({
  onStart,
  scores,
  unlocked,
  startLevel,
  setStartLevel,
}: {
  onStart: () => void;
  scores: ScoreEntry[];
  unlocked: number;
  startLevel: number;
  setStartLevel: (n: number) => void;
}) {
  return (
    <Overlay>
      <div className="w-full max-w-4xl">
        <div className="cc-panel cc-scan relative overflow-hidden rounded-2xl p-4 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Logo />
              <div className="text-right text-[10px] leading-tight tracking-widest text-slate-500">
                50 SHIFTS · 3 LIVES
                <br />
                NURSE CALL RESPONSE SIM
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-slate-300">
                  You're the nurse on shift. Calls light up the <span className="text-cyan-300">annunciator</span> and the
                  over-door lamps. Sprint to the room, hold at the call point to reset it — before the timer runs out.
                  Miss a call and you lose a life. Clear every call, then return to the{" "}
                  <span className="text-emerald-300">nurses station</span> to end the shift.
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <LegendTile kind="emergency" desc="Highest priority. Very short fuse." />
                  <LegendTile kind="patient" desc="Standard bedside call." />
                  <LegendTile kind="assist" desc="Colleague needs a hand." />
                  <LegendTile kind="keys" desc="Grab keys from the station first." />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 sm:grid-cols-4">
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
                <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-snug text-amber-200/90">
                  <b>Later shifts:</b> 🍽️ meal calls need a tray from the pantry (slows you down) · 🚻 toilet assists must be
                  escorted to the WC · 🔑 key calls need the key ring · lights go down on evening &amp; night shifts.
                </div>
                <div className="rounded-lg border border-yellow-400/25 bg-yellow-400/5 px-2.5 py-2 text-[11px] leading-snug text-yellow-200/90">
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
                <ScoreTable scores={scores} />
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
  scores,
  qualifies,
  onSubmit,
  onRestart,
  onRetry,
  onMenu,
  victory,
}: {
  hud: Hud;
  scores: ScoreEntry[];
  qualifies: boolean;
  onSubmit: (name: string) => void;
  onRestart: () => void;
  onRetry: () => void;
  onMenu: () => void;
  victory: boolean;
}) {
  const [name, setName] = useState("NURSE");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (qualifies && inputRef.current) inputRef.current.select();
  }, [qualifies]);

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
              {qualifies && !saved && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5">
                  <div className="text-[10px] tracking-[0.22em] text-amber-300">NEW HIGH SCORE — SIGN IN</div>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      ref={inputRef}
                      value={name}
                      maxLength={8}
                      onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 font-mono text-sm uppercase tracking-widest text-amber-200 outline-none focus:border-amber-400/60"
                    />
                    <button
                      onClick={() => {
                        onSubmit(name);
                        setSaved(true);
                      }}
                      className="cc-btn rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold tracking-widest text-[#2a1a02]"
                    >
                      SAVE
                    </button>
                  </div>
                </div>
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
            <ScoreTable scores={scores} />
          </div>
        </div>
      </div>
    </Overlay>
  );
}

export function Banner({ hud }: { hud: Hud }) {
  const brief = hud.phase === "briefing";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1.5 p-2">
      {brief && (
        <div className="cc-pop mt-6 flex flex-col items-center">
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
