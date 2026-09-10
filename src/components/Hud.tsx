import type { Hud as HudData } from "../game/engine";

function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].slice(0, Math.max(3, lives)).map((i) => (
        <span
          key={i}
          className={`text-[15px] leading-none transition-all duration-200 ${
            i < lives ? "scale-100 opacity-100 drop-shadow-[0_0_6px_rgba(255,60,90,0.8)]" : "scale-75 opacity-25 grayscale"
          }`}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

export default function Hud({
  hud,
  compact = false,
  muted,
  onPause,
  onMute,
}: {
  hud: HudData;
  compact?: boolean;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
}) {
  const carryLabel =
    hud.carry === "keys" ? "🔑 KEYS" : hud.carry === "tray" ? "🍽️ TRAY" : hud.carry === "mop" ? "🧹 MOP" : null;

  if (compact) {
    return (
      <div className="cc-panel flex shrink-0 items-center gap-2 rounded-lg px-2 py-1">
        <div className="flex flex-col">
          <span className="font-mono text-[15px] leading-none text-amber-300">{hud.score.toLocaleString()}</span>
          <span className="mt-0.5 text-[8px] tracking-widest text-slate-500">
            SHIFT {hud.level} · {hud.shiftDone}/{hud.shiftTotal}
          </span>
        </div>
        <div className="flex flex-col items-start gap-1">
          <Hearts lives={hud.lives} />
          <div className="flex items-center gap-1">
            {hud.combo > 1 && (
              <span className="rounded bg-amber-400/20 px-1 font-mono text-[9px] leading-none text-amber-300">
                x{hud.mult.toFixed(1)}
              </span>
            )}
            {carryLabel && (
              <span className="rounded bg-cyan-400/15 px-1 text-[8px] leading-tight text-cyan-200">{carryLabel}</span>
            )}
            {hud.messes > 0 && (
              <span className="cc-blink rounded bg-yellow-400/20 px-1 text-[8px] leading-tight text-yellow-200">
                🧹{hud.messes}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-col gap-0.5">
          <button
            onClick={onPause}
            className="cc-btn h-[22px] w-[26px] rounded bg-white/5 text-[9px] text-slate-300"
            aria-label="pause"
          >
            ❚❚
          </button>
          <button
            onClick={onMute}
            className="cc-btn h-[22px] w-[26px] rounded bg-white/5 text-[9px] text-slate-300 active:bg-white/10"
            aria-label="mute"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-panel flex flex-col gap-2.5 rounded-xl p-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-[0.2em] text-slate-500">SCORE</div>
          <div key={Math.floor(hud.score / 500)} className="cc-pop font-mono text-3xl leading-none text-amber-300">
            {hud.score.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.2em] text-slate-500">SHIFT</div>
          <div className="font-mono text-2xl leading-none text-cyan-200">
            {hud.level}
            <span className="text-sm text-slate-500">/50</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-black/30 px-2 py-1.5">
        <span className="text-[10px] tracking-[0.2em] text-slate-500">LIVES</span>
        <Hearts lives={hud.lives} />
      </div>

      <div className="rounded-lg bg-black/30 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.2em] text-slate-500">COMBO</span>
          <span className="font-mono text-sm text-amber-300">x{hud.mult.toFixed(1)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-transform duration-150"
            style={{ transform: `scaleX(${Math.min(1, hud.combo / 20)})` }}
          />
        </div>
      </div>

      <div className="rounded-lg bg-black/30 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.2em] text-slate-500">SHIFT PROGRESS</span>
          <span className="font-mono text-xs text-cyan-200">
            {hud.shiftDone}/{hud.shiftTotal}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-transform duration-300"
            style={{ transform: `scaleX(${hud.shiftTotal ? hud.shiftDone / hud.shiftTotal : 0})` }}
          />
        </div>
      </div>

      {hud.escorting && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.18em] text-amber-300">ESCORT → WC</span>
            <span className="font-mono text-[10px] text-amber-200">
              {hud.escortUrgency > 0.65 ? "HURRY!" : "WALKING"}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full origin-left rounded-full transition-transform duration-150 ${
                hud.escortUrgency > 0.65 ? "cc-blink bg-rose-400" : "bg-amber-400"
              }`}
              style={{ transform: `scaleX(${1 - hud.escortUrgency})` }}
            />
          </div>
        </div>
      )}

      {hud.messes > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-2 py-1.5">
          <span className="text-[10px] tracking-[0.18em] text-yellow-200">🧹 SPILLS TO CLEAN</span>
          <span className="font-mono text-sm text-yellow-200">{hud.messes}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/30 px-2 py-1.5">
          <div className="text-[9px] tracking-[0.18em] text-slate-500">CARRYING</div>
          <div className="mt-0.5 truncate text-xs text-cyan-100">{carryLabel ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-1.5">
          <div className="text-[9px] tracking-[0.18em] text-slate-500">DASH</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full origin-left rounded-full ${
                hud.dashReady >= 1 ? "bg-cyan-300 shadow-[0_0_8px_#67e8f9]" : "bg-cyan-700"
              }`}
              style={{ transform: `scaleX(${Math.min(1, hud.dashReady)})` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPause}
          className="cc-btn flex-1 rounded-lg border border-cyan-400/20 bg-cyan-500/10 py-1.5 text-xs font-bold tracking-widest text-cyan-200"
        >
          PAUSE
        </button>
        <button
          onClick={onMute}
          className="cc-btn w-11 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300"
          aria-label="mute"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}
