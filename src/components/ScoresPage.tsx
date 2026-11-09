import { useEffect, useMemo, useRef, useState } from "react";
import type { SharedLeaderboardState } from "../hooks/useSharedLeaderboard";
import { SCORE_LIMIT } from "../lib/highScores";
import { isSeedId } from "../lib/seedScores";
import LeaderboardSetup from "./LeaderboardSetup";
import { MEDAL, Status } from "./Leaderboard";

const MAX_SHIFT = 50;

/** Podium card for one of the leading three places. */
function Podium({
  place,
  name,
  score,
  level,
  mine,
  house,
}: {
  place: number;
  name: string;
  score: number;
  level: number;
  mine: boolean;
  house: boolean;
}) {
  const medal = MEDAL[place - 1];
  const first = place === 1;
  const order = place === 1 ? "sm:order-2" : place === 2 ? "sm:order-1" : "sm:order-3";
  const lift = first ? "sm:pb-7" : place === 2 ? "sm:pb-4" : "sm:pb-2";

  return (
    <li className={`relative min-w-0 ${order} ${lift}`}>
      <div
        className={`cc-pop relative flex h-full flex-col overflow-hidden rounded-xl border px-3 pb-3 pt-3.5 ${
          first ? "sm:pt-5" : ""
        }`}
        style={{
          borderColor: mine ? "rgba(255,210,74,0.6)" : `${medal}44`,
          background: `linear-gradient(165deg, ${medal}1c, rgba(8,15,24,0.94) 62%)`,
          boxShadow: `0 0 34px -18px ${medal}, inset 0 1px 0 ${medal}33`,
          animationDelay: `${(place - 1) * 70}ms`,
        }}
      >
        {/* rank plate */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-base font-bold"
            style={{ color: medal, background: `${medal}22`, boxShadow: `0 0 16px -5px ${medal}` }}
          >
            {place}
          </span>
          {first && (
            <span className="text-[9px] font-bold tracking-[0.24em]" style={{ color: medal }}>
              WARD CHAMPION
            </span>
          )}
          {mine && (
            <span className="rounded bg-amber-400/25 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-200">
              YOU
            </span>
          )}
        </div>

        <div className={`mt-2.5 truncate font-bold tracking-wide ${first ? "text-2xl" : "text-xl"}`} style={{ color: "#f2f8fd" }}>
          {name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-slate-500">
          {house ? "HOUSE RECORD" : "PLAYER RUN"}
        </div>

        <div
          className={`mt-2 font-mono leading-none ${first ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
          style={{ color: medal, textShadow: `0 0 26px ${medal}55` }}
        >
          {score.toLocaleString()}
        </div>

        {/* how far through the fifty shifts this run reached */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[9px] tracking-[0.18em] text-slate-500">
            <span>SHIFT REACHED</span>
            <span className="font-mono text-[11px]" style={{ color: medal }}>{level}/{MAX_SHIFT}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="cc-grow h-full rounded-full"
              style={{
                width: `${Math.max(4, (level / MAX_SHIFT) * 100)}%`,
                background: `linear-gradient(90deg, ${medal}, ${medal}66)`,
                boxShadow: `0 0 10px ${medal}`,
                animationDelay: `${180 + (place - 1) * 70}ms`,
              }}
            />
          </div>
        </div>

        {first && (
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
            style={{ background: `${medal}33` }}
          />
        )}
      </div>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.07] bg-black/35 px-2.5 py-2">
      <div className="text-[9px] tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[15px]" style={{ color: tone }}>{value}</div>
    </div>
  );
}

export default function ScoresPage({
  shared,
  highlightId,
  onBack,
  onPlay,
}: {
  shared: SharedLeaderboardState;
  highlightId?: string | null;
  onBack: () => void;
  onPlay: () => void;
}) {
  const [setupOpen, setSetupOpen] = useState(false);
  const restRef = useRef<HTMLOListElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const board = shared.board;
  const top = board.slice(0, 3);
  const rest = board.slice(3);

  const stats = useMemo(() => {
    const furthest = board.reduce((m, s) => Math.max(m, s.level), 0);
    const players = board.filter((s) => !isSeedId(s.id)).length;
    return { furthest, players };
  }, [board]);

  // Escape leaves the page, exactly as it leaves the pause screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  // Fade cue while places remain below the fold of the inner list.
  useEffect(() => {
    const el = restRef.current;
    if (!el) {
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
  }, [rest.length]);

  // Land on the player's own row when arriving straight from a run.
  useEffect(() => {
    if (!highlightId || !restRef.current) return;
    const row = restRef.current.querySelector<HTMLElement>(`[data-run="${highlightId}"]`);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightId, board]);

  return (
    <section
      aria-label={`Top ${SCORE_LIMIT} scores`}
      className="cc-scroll absolute inset-0 z-30 overflow-y-auto overscroll-contain bg-[#040a11]"
      style={{ touchAction: "pan-y" }}
    >
      {/* ward atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="cc-grid-bg absolute inset-0 opacity-60" />
        <div
          className="cc-drift absolute -inset-1/4"
          style={{
            background:
              "radial-gradient(42% 34% at 16% 6%, rgba(0,174,239,0.20), transparent 62%), radial-gradient(38% 30% at 86% 10%, rgba(255,210,74,0.13), transparent 60%), radial-gradient(46% 36% at 70% 96%, rgba(37,224,122,0.10), transparent 64%)",
            filter: "blur(14px)",
          }}
        />
      </div>

      {/* sticky ward header — back action always reachable */}
      <header
        className="sticky top-0 z-20 border-b border-cyan-400/20 bg-[#050c14]/92 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-3 py-2 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="cc-btn group flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 text-[10px] font-bold tracking-[0.16em] text-cyan-200"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">◂</span>
            <span className="hidden sm:inline">MAIN MENU</span>
            <span className="sm:hidden">MENU</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[13px] font-bold tracking-[0.2em] text-white sm:text-[15px]">
                WARD HONOURS
              </h1>
              <Status shared={shared} />
            </div>
            <div className="truncate font-mono text-[9px] tracking-[0.18em] text-slate-500">
              TOP {SCORE_LIMIT} · ALL PLAYERS · {board.length}/{SCORE_LIMIT} PLACES
            </div>
          </div>
          {shared.configured && (
            <button
              type="button"
              disabled={shared.loading}
              onClick={() => void shared.refresh()}
              className="cc-btn min-h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[10px] font-bold tracking-widest text-cyan-200 disabled:opacity-40"
            >
              {shared.loading ? "SYNC…" : "REFRESH"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            title="Leaderboard connection"
            className="cc-btn min-h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] tracking-widest text-slate-400"
          >
            SETUP
          </button>
        </div>
      </header>

      <div
        className="relative mx-auto w-full max-w-4xl px-3 pb-6 pt-4"
        style={{
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {shared.error && (
          <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5">
            <p role="status" className="text-[12px] leading-snug text-amber-200">{shared.error}</p>
            <button
              type="button"
              disabled={shared.loading}
              onClick={() => void shared.refresh()}
              className="cc-btn mt-2 min-h-9 rounded-lg bg-amber-400/15 px-3 text-[10px] font-bold tracking-widest text-amber-200 disabled:opacity-50"
            >
              {shared.loading ? "RELOADING…" : "RELOAD BOARD"}
            </button>
          </div>
        )}

        {shared.usingSeed && !shared.error && (
          <p className="mb-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-[11px] leading-snug text-cyan-200/85">
            {shared.configured
              ? "Opening board — connecting for live scores…"
              : "Opening house records. Finish a run from shift 1 to put your name on the board."}
          </p>
        )}

        {/* ---- podium ---- */}
        <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:items-end">
          {top.map((s, i) => (
            <Podium
              key={s.id || `${s.date}-${i}`}
              place={i + 1}
              name={s.name}
              score={s.score}
              level={s.level}
              mine={Boolean(highlightId && s.id === highlightId)}
              house={isSeedId(s.id)}
            />
          ))}
        </ol>

        {/* ---- board stats, all derived from the live board ---- */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="LEADER" value={top[0]?.name ?? "—"} tone="#ffd24a" />
          <Stat label="FURTHEST SHIFT" value={`${stats.furthest}/${MAX_SHIFT}`} tone="#67e8f9" />
          <Stat
            label="TO BEAT"
            value={shared.cutoff > 0 ? shared.cutoff.toLocaleString() : "OPEN"}
            tone="#25e07a"
          />
          <Stat label="PLAYER RUNS" value={String(stats.players)} tone="#b061ff" />
        </div>

        {/* ---- places 4-20 ---- */}
        {rest.length > 0 && (
          <>
            <div className="mb-2 mt-5 flex items-center gap-3">
              <h2 className="shrink-0 text-[10px] font-bold tracking-[0.24em] text-cyan-300">
                PLACES 4–{board.length}
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/35 to-transparent" />
            </div>

            <div className="cc-panel relative overflow-hidden rounded-xl p-2">
              <div className="relative min-h-0">
                <ol
                  ref={restRef}
                  className="cc-scroll -mr-1 flex max-h-[min(52vh,420px)] min-h-0 flex-col gap-0.5 overflow-y-auto pr-1"
                >
                  {rest.map((s, i) => {
                    const place = i + 4;
                    const mine = Boolean(highlightId && s.id === highlightId);
                    return (
                      <li
                        key={s.id || `${s.date}-${place}`}
                        data-run={s.id}
                        className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 font-mono text-[13px] transition-colors ${
                          mine ? "bg-amber-400/20 ring-1 ring-amber-300/50" : i % 2 ? "bg-white/[0.03]" : ""
                        }`}
                      >
                        <span className="w-6 shrink-0 text-right text-[12px] font-bold text-slate-500">{place}</span>
                        <span className={`min-w-0 flex-1 truncate ${mine ? "text-amber-100" : "text-slate-100"}`}>
                          {s.name}
                          {mine && <span className="ml-1.5 text-[9px] tracking-widest text-amber-300">YOU</span>}
                          {!mine && isSeedId(s.id) && (
                            <span className="ml-1.5 text-[8px] tracking-widest text-slate-600">HOUSE</span>
                          )}
                        </span>
                        <span className="hidden w-24 shrink-0 sm:block">
                          <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full bg-cyan-400/70"
                              style={{ width: `${Math.max(5, (s.score / (top[0]?.score || 1)) * 100)}%` }}
                            />
                          </span>
                        </span>
                        <span className={`shrink-0 ${mine ? "text-amber-200" : "text-amber-300/90"}`}>
                          {s.score.toLocaleString()}
                        </span>
                        <span className="w-11 shrink-0 text-right text-[10px] text-slate-500">S{s.level}</span>
                      </li>
                    );
                  })}
                </ol>
                {moreBelow && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-[#0a1220] to-transparent" />
                    <button
                      type="button"
                      onClick={() => restRef.current?.scrollBy({ top: 200, behavior: "smooth" })}
                      className="cc-btn absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-cyan-200"
                    >
                      MORE ▾
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ---- exits ---- */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="cc-btn min-h-12 flex-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold tracking-[0.18em] text-cyan-200"
          >
            ◂ BACK TO MAIN MENU
          </button>
          <button
            type="button"
            onClick={onPlay}
            className="cc-btn min-h-12 flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-[11px] font-bold tracking-[0.18em] text-[#04202b] shadow-[0_0_30px_-8px_rgba(34,211,238,0.7)]"
          >
            START A SHIFT ▸
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] tracking-[0.18em] text-slate-600">
          ESC RETURNS TO THE MENU · RANKED RUNS START AT SHIFT 1
        </p>
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
