import { CALL_META, TASK_META } from "../game/constants";
import type { HudCall } from "../game/engine";

function Row({ call }: { call: HudCall }) {
  const meta = CALL_META[call.kind];
  const frac = call.state === "escort" ? 1 : Math.max(0, call.remaining / call.limit);
  const urgent = frac < 0.32 && call.state !== "escort";
  return (
    <div
      className="cc-rise relative overflow-hidden rounded-md border-l-4 bg-black/45 px-2 py-1.5"
      style={{ borderColor: meta.color, boxShadow: urgent ? `0 0 16px -2px ${meta.color}` : undefined }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgent ? "cc-blink" : "cc-pulse"}`}
          style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
        />
        <span className="font-mono text-[15px] leading-none tracking-tight text-white">RM{call.room}</span>
        <span className="truncate text-[11px] font-semibold leading-none tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="ml-auto font-mono text-[13px] leading-none text-slate-300">
          {call.state === "escort" ? "→WC" : `${call.remaining.toFixed(1)}s`}
        </span>
      </div>
      {call.task !== "none" && (
        <div className="mt-1 inline-block rounded-sm bg-white/10 px-1 py-px text-[9px] font-bold tracking-widest text-amber-200">
          {TASK_META[call.task].label}
        </div>
      )}
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full origin-left rounded-full transition-transform duration-100 ease-linear"
          style={{ background: meta.color, transform: `scaleX(${frac})` }}
        />
      </div>
    </div>
  );
}

function Chip({ call }: { call: HudCall }) {
  const meta = CALL_META[call.kind];
  const frac = call.state === "escort" ? 1 : Math.max(0, call.remaining / call.limit);
  const urgent = frac < 0.32 && call.state !== "escort";
  return (
    <div
      className="cc-rise flex shrink-0 flex-col gap-1 rounded border-l-[3px] bg-black/50 px-1.5 py-1"
      style={{ borderColor: meta.color, boxShadow: urgent ? `0 0 12px -2px ${meta.color}` : undefined }}
    >
      <div className="flex items-center gap-1">
        <span
          className={`h-2 w-2 rounded-full ${urgent ? "cc-blink" : ""}`}
          style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
        />
        <span className="font-mono text-[12px] leading-none text-white">{call.room}</span>
        <span className="font-mono text-[10px] leading-none text-slate-400">
          {call.state === "escort" ? "WC" : Math.ceil(call.remaining)}
        </span>
      </div>
      <div className="h-[3px] w-11 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full origin-left transition-transform duration-100 ease-linear"
          style={{ background: meta.color, transform: `scaleX(${frac})` }}
        />
      </div>
    </div>
  );
}

export default function Annunciator({
  calls,
  ward,
  compact = false,
}: {
  calls: HudCall[];
  ward: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="cc-panel relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-lg px-1.5 py-1">
        <div className="flex shrink-0 flex-col items-center border-r border-cyan-400/20 pr-1.5">
          <span className="text-[8px] font-bold leading-none tracking-widest text-cyan-300/80">CALLS</span>
          <span className="font-mono text-[16px] leading-tight text-white">{calls.length}</span>
        </div>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {calls.length === 0 ? (
            <span className="self-center px-1 text-[10px] font-bold tracking-widest text-emerald-400">ALL CLEAR</span>
          ) : (
            calls.slice(0, 6).map((c) => <Chip key={c.id} call={c} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-panel cc-scan relative flex min-h-0 flex-col overflow-hidden rounded-xl lg:flex-1">
      <div className="flex items-center justify-between border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-transparent px-3 py-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            CARECALL ANNUNCIATOR
          </div>
          <div className="mt-0.5 font-mono text-[10px] tracking-wide text-slate-400">{ward}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl leading-none text-white">{String(calls.length).padStart(2, "0")}</div>
          <div className="text-[9px] tracking-widest text-slate-500">ACTIVE</div>
        </div>
      </div>
      <div
        style={{ touchAction: "pan-y" }}
        className="flex max-h-[42vh] min-h-[112px] flex-1 flex-col gap-1.5 overflow-y-auto p-2 lg:max-h-none"
      >
        {calls.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6">
            <span className="text-sm font-bold tracking-[0.25em] text-emerald-400">ALL CLEAR</span>
            <span className="text-[10px] tracking-widest text-slate-500">NO ACTIVE CALLS</span>
          </div>
        ) : (
          calls.map((c) => <Row key={c.id} call={c} />)
        )}
      </div>
    </div>
  );
}
