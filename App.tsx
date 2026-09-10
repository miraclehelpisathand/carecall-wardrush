import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import Annunciator from "./components/Annunciator";
import Hud from "./components/Hud";
import { Banner, GameOverScreen, LevelCompleteScreen, Logo, PauseScreen, StartScreen } from "./components/Screens";
import { MiracleLogo } from "./components/BrandLogo";
import { Engine, type Hud as HudData } from "./game/engine";
import { sfx } from "./game/audio";
import { loadProgress, saveProgress, useHighScores } from "./hooks/useHighScores";

function useMedia(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export default function App() {
  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) engineRef.current = new Engine();
  const engine = engineRef.current;

  const [hud, setHud] = useState<HudData>(() => engine.snapshot());
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(() => loadProgress());
  const [startLevel, setStartLevel] = useState(() => loadProgress());
  const [countdown, setCountdown] = useState(6);
  const { scores, submit, qualifies } = useHighScores();

  const wide = useMedia("(min-width: 1024px)");
  const touch = useMedia("(pointer: coarse)");

  const onHud = useCallback((h: HudData) => setHud(h), []);

  const start = useCallback(
    (level: number) => {
      sfx.resume();
      sfx.ui();
      engine.startRun(level);
      setHud(engine.snapshot());
      setPaused(false);
      setScreen("game");
    },
    [engine],
  );

  const goMenu = useCallback(() => {
    engine.resetLevel(1);
    engine.demo();
    setHud(engine.snapshot());
    setPaused(false);
    setScreen("menu");
  }, [engine]);

  const next = useCallback(() => {
    engine.nextLevel();
    setHud(engine.snapshot());
  }, [engine]);
  const nextRef = useRef(next);
  nextRef.current = next;

  const togglePause = useCallback(() => {
    if (engine.phase === "complete" || engine.phase === "gameover") return;
    setPaused((p) => {
      if (!p) sfx.ui();
      return !p;
    });
  }, [engine]);

  // level complete -> save progress + auto advance
  useEffect(() => {
    if (hud.phase !== "complete") return;
    saveProgress(hud.level + 1);
    setUnlocked(loadProgress());
    let n = 6;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(iv);
        nextRef.current();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [hud.phase, hud.level]);

  useEffect(() => {
    sfx.setEnabled(!muted);
  }, [muted]);

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") {
        if (screen === "menu") start(startLevel);
        else if (engine.phase === "gameover") start(engine.level >= 50 ? 1 : engine.level);
        else if (engine.phase === "complete") next();
      }
      if (e.key.toLowerCase() === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, startLevel, start, next, engine]);

  // auto pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screen === "game" && engine.phase !== "complete" && engine.phase !== "gameover")
        setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [screen, engine]);

  const running = screen === "game" && !paused;
  const victory = hud.phase === "gameover" && hud.level >= 50 && hud.lives > 0;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#05090f] lg:flex-row">
      {/* ---------------- play area ---------------- */}
      <main className="relative order-2 min-h-0 flex-1 lg:order-1">
        <div className="absolute inset-0 cc-grid-bg opacity-40" />
        <GameCanvas
          engine={engine}
          running={running}
          ambient={screen === "menu"}
          onHud={onHud}
          onPauseKey={togglePause}
        />
        {screen === "game" && <Banner hud={hud} />}

        {screen === "game" && touch && (
          <>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                engine.queueDash();
              }}
              className="absolute bottom-4 right-4 z-20 flex h-20 w-20 select-none items-center justify-center rounded-full border-2 border-cyan-300/40 bg-cyan-400/15 text-[11px] font-bold tracking-widest text-cyan-100 backdrop-blur-sm active:scale-95 active:bg-cyan-300/30"
              style={{
                boxShadow: hud.dashReady >= 1 ? "0 0 26px -4px rgba(103,232,249,0.8)" : "none",
                opacity: hud.dashReady >= 1 ? 1 : 0.45,
              }}
            >
              DASH
            </button>
            <div className="pointer-events-none absolute bottom-5 left-4 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[10px] tracking-widest text-slate-400">
              DRAG TO MOVE
            </div>
          </>
        )}
      </main>

      {/* ---------------- side / top rail ---------------- */}
      <aside className="order-1 flex shrink-0 items-stretch gap-2 p-2 lg:order-2 lg:w-[320px] lg:flex-col lg:p-3">
        {wide ? (
          <>
            <div className="flex items-center justify-between px-1">
              <Logo small />
            </div>
            <Annunciator calls={hud.calls} ward={hud.wardName} />
            <Hud hud={hud} muted={muted} onPause={togglePause} onMute={() => setMuted((m) => !m)} />
            <div className="mt-auto hidden px-1 lg:block">
              <div className="text-[9px] leading-relaxed tracking-widest text-slate-600">
                WASD / ARROWS MOVE · SPACE DASH · ESC PAUSE
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2 opacity-55">
                <MiracleLogo className="h-5" />
                <span className="text-[8px] leading-tight tracking-[0.2em] text-slate-600">CARECALL™ SIM</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <Hud hud={hud} compact muted={muted} onPause={togglePause} onMute={() => setMuted((m) => !m)} />
            <Annunciator calls={hud.calls} ward={hud.wardName} compact />
          </>
        )}
      </aside>

      {/* ---------------- overlays ---------------- */}
      {screen === "menu" && (
        <StartScreen
          onStart={() => start(startLevel)}
          scores={scores}
          unlocked={unlocked}
          startLevel={Math.min(startLevel, unlocked)}
          setStartLevel={setStartLevel}
        />
      )}
      {screen === "game" && paused && hud.phase !== "gameover" && hud.phase !== "complete" && (
        <PauseScreen onResume={() => setPaused(false)} onQuit={goMenu} />
      )}
      {screen === "game" && hud.phase === "complete" && (
        <LevelCompleteScreen hud={hud} onNext={next} countdown={countdown} />
      )}
      {screen === "game" && hud.phase === "gameover" && (
        <GameOverScreen
          hud={hud}
          scores={scores}
          qualifies={qualifies(hud.score)}
          victory={victory}
          onSubmit={(name) => submit(name, hud.score, hud.level)}
          onRestart={() => start(1)}
          onRetry={() => start(victory ? 1 : hud.level)}
          onMenu={goMenu}
        />
      )}
    </div>
  );
}
