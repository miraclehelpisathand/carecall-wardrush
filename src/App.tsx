import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import Annunciator from "./components/Annunciator";
import Hud from "./components/Hud";
import { Banner, GameOverScreen, LevelCompleteScreen, Logo, PauseScreen, StartScreen } from "./components/Screens";

import { Engine, type Hud as HudData } from "./game/engine";
import { sfx } from "./game/audio";
import { loadProgress, saveProgress, useHighScores } from "./hooks/useHighScores";
import { useDevice } from "./hooks/useDevice";
import LandscapeGate from "./components/LandscapeGate";

type LockableScreen = Screen & {
  orientation?: { lock?: (o: string) => Promise<unknown>; unlock?: () => void };
};
type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

/**
 * Best-effort fullscreen + landscape lock. Android Chrome honours both, which
 * removes the URL bar entirely; iOS Safari rejects, so the on-screen rotate
 * gate is what covers it. Never throws — a refused request just does nothing.
 */
function tryEnterImmersive() {
  try {
    const el = document.documentElement as FullscreenEl;
    const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    const lock = () => {
      const so = window.screen as LockableScreen;
      try {
        void so.orientation?.lock?.("landscape");
      } catch {
        /* orientation lock unsupported */
      }
    };
    if (req) {
      const p = req();
      if (p && typeof p.then === "function") void p.then(lock).catch(lock);
      else lock();
    } else {
      lock();
    }
  } catch {
    /* fullscreen refused — stay embedded */
  }
}

function tryExitImmersive() {
  try {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen();
    else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
    (window.screen as LockableScreen).orientation?.unlock?.();
  } catch {
    /* ignore */
  }
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

  const device = useDevice();
  const { handheld, desktop, touch, portrait } = device;

  // A phone held in portrait can't show the ward, so the game is blocked until
  // it's turned — and any running shift is paused so calls can't expire on you.
  const needsLandscape = touch && portrait && device.shortSide < 800;
  const pausedByRotate = useRef(false);
  useEffect(() => {
    if (needsLandscape) {
      if (screen === "game" && engine.phase !== "complete" && engine.phase !== "gameover") {
        pausedByRotate.current = true;
        setPaused(true);
      }
    } else if (pausedByRotate.current) {
      pausedByRotate.current = false;
      if (screen === "game") setPaused(false);
    }
  }, [needsLandscape, screen, engine]);

  const onHud = useCallback((h: HudData) => setHud(h), []);

  const start = useCallback(
    (level: number) => {
      sfx.resume();
      sfx.ui();
      engine.startRun(level);
      setHud(engine.snapshot());
      setPaused(false);
      setScreen("game");
      // phones/tablets only — desktop stays in its normal window
      if (handheld) tryEnterImmersive();
    },
    [engine, handheld],
  );

  const goMenu = useCallback(() => {
    engine.resetLevel(1);
    engine.demo();
    setHud(engine.snapshot());
    setPaused(false);
    setScreen("menu");
    tryExitImmersive();
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

  const hudBar = (
    <Hud hud={hud} compact={!desktop} muted={muted} onPause={togglePause} onMute={() => setMuted((m) => !m)} />
  );
  const callBar = <Annunciator calls={hud.calls} ward={hud.wardName} compact={!desktop} />;

  return (
    <div
      className={`relative h-[100dvh] w-full overflow-hidden bg-[#05090f] ${desktop ? "flex flex-row" : "block"}`}
    >
      {/* ---------------- play area ---------------- */}
      <main className={desktop ? "relative min-h-0 min-w-0 flex-1" : "absolute inset-0"}>
        <div className="absolute inset-0 cc-grid-bg opacity-40" />
        <GameCanvas
          engine={engine}
          running={running}
          ambient={screen === "menu"}
          handheld={handheld}
          onHud={onHud}
          onPauseKey={togglePause}
        />
        {screen === "game" && <Banner hud={hud} offset={desktop ? 12 : 104} />}

        {/* phone / tablet: HUD floats over the ward so the canvas can use the full screen */}
        {!desktop && screen === "game" && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1"
            style={{
              paddingTop: "max(6px, env(safe-area-inset-top))",
              paddingLeft: "max(8px, env(safe-area-inset-left))",
              paddingRight: "max(8px, env(safe-area-inset-right))",
            }}
          >
            <div className="pointer-events-auto flex min-w-0 items-stretch gap-1.5">{hudBar}</div>
            <div className="pointer-events-auto">{callBar}</div>
          </div>
        )}

        {screen === "game" && touch && (
          <>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                engine.queueDash();
              }}
              className="absolute z-20 flex h-[76px] w-[76px] select-none items-center justify-center rounded-full border-2 border-cyan-300/40 bg-cyan-400/15 text-[11px] font-bold tracking-widest text-cyan-100 backdrop-blur-sm active:scale-95 active:bg-cyan-300/30 sm:h-20 sm:w-20"
              style={{
                right: "max(12px, env(safe-area-inset-right))",
                bottom: "max(14px, env(safe-area-inset-bottom))",
                boxShadow: hud.dashReady >= 1 ? "0 0 26px -4px rgba(103,232,249,0.8)" : "none",
                opacity: hud.dashReady >= 1 ? 1 : 0.45,
              }}
            >
              DASH
            </button>
            <div
              className="pointer-events-none absolute z-10 rounded-full bg-black/45 px-2.5 py-1 text-[10px] tracking-widest text-slate-400"
              style={{
                left: "max(12px, env(safe-area-inset-left))",
                bottom: "max(16px, env(safe-area-inset-bottom))",
              }}
            >
              DRAG TO MOVE
            </div>
          </>
        )}
      </main>

      {/* ---------------- desktop side rail ---------------- */}
      {desktop && (
        <aside className="flex w-[320px] shrink-0 flex-col gap-2 p-3">
          <div className="flex items-center justify-between px-1">
            <Logo small />
          </div>
          {callBar}
          {hudBar}
          <div className="mt-auto px-1 text-[9px] leading-relaxed tracking-widest text-slate-600">
            WASD / ARROWS MOVE · SPACE DASH · ESC PAUSE
          </div>
        </aside>
      )}

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

      {/* portrait phone/tablet — blocks the whole app until the device is turned */}
      <LandscapeGate visible={needsLandscape} />
    </div>
  );
}
