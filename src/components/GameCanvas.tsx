import { useEffect, useRef } from "react";
import { WORLD_H, WORLD_W } from "../game/constants";
import type { Engine, Hud } from "../game/engine";
import { renderFrame, renderStatic } from "../game/render";
import { loadBrand } from "../game/brand";

interface Props {
  engine: Engine;
  running: boolean;
  ambient?: boolean;
  onHud: (h: Hud) => void;
  onPauseKey: () => void;
}

const MOVE_KEYS: Record<string, [number, number]> = {
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
};

export default function GameCanvas({ engine, running, ambient = false, onHud, onPauseKey }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(running);
  const ambientRef = useRef(ambient);
  const hudRef = useRef(onHud);
  const pauseRef = useRef(onPauseKey);
  runRef.current = running;
  ambientRef.current = ambient;
  hudRef.current = onHud;
  pauseRef.current = onPauseKey;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const stick = stickRef.current;
    const knob = knobRef.current;
    if (!canvas || !wrap || !stick || !knob) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const bg = document.createElement("canvas");
    const bgCtx = bg.getContext("2d");
    if (!bgCtx) return;

    let scale = 1;
    let dpr = 1;
    let sPix = 0;
    let vw = WORLD_W;
    let vh = WORLD_H;
    let camX = WORLD_W / 2;
    let camY = WORLD_H / 2;
    let cssW = 1;
    let cssH = 1;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const cw = Math.max(280, Math.floor(rect.width));
      const ch = Math.max(200, Math.floor(rect.height));
      cssW = cw;
      cssH = ch;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      const fit = Math.min(cw / WORLD_W, ch / WORLD_H);
      // if the whole ward would be postage-stamp sized (portrait phones), zoom in and follow
      scale = WORLD_H * fit < 330 ? Math.max(fit, Math.min(cw / 720, ch / 660)) : fit;
      vw = cw / scale;
      vh = ch / scale;
      const want = Math.min(scale * dpr, 2.2);
      if (sPix === 0 || Math.abs(want - sPix) / sPix > 0.03) {
        sPix = want;
        bg.width = Math.ceil(WORLD_W * sPix);
        bg.height = Math.ceil(WORLD_H * sPix);
        bgCtx.setTransform(sPix, 0, 0, sPix, 0, 0);
        renderStatic(bgCtx);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const redrawStatic = () => {
      sPix = 0;
      resize();
    };
    // webfonts and brand artwork may land after the first static render
    if (document.fonts?.ready) void document.fonts.ready.then(redrawStatic);
    loadBrand(redrawStatic);

    // ------------------------------------------------------------- input
    const keys = new Set<string>();
    const onKeyDown = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k in MOVE_KEYS || k === " " || k === "spacebar") ev.preventDefault();
      if (ev.repeat) return;
      if (k === " " || k === "spacebar" || k === "shift") engine.queueDash();
      else if (k === "escape" || k === "p") pauseRef.current();
      else keys.add(k);
    };
    const onKeyUp = (ev: KeyboardEvent) => keys.delete(ev.key.toLowerCase());
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const stickState = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
    const RADIUS = 54;

    const setKnob = (dx: number, dy: number) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const showStick = (x: number, y: number) => {
      stick.style.transform = `translate(${x - 52}px, ${y - 52}px)`;
      stick.style.opacity = "1";
      setKnob(0, 0);
    };

    const onDown = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      if (!stickState.active && x < rect.width * 0.6) {
        stickState.active = true;
        stickState.id = ev.pointerId;
        stickState.ox = x;
        stickState.oy = y;
        stickState.dx = 0;
        stickState.dy = 0;
        canvas.setPointerCapture(ev.pointerId);
        showStick(x, y);
      } else {
        engine.queueDash();
      }
    };
    const onMove = (ev: PointerEvent) => {
      if (!stickState.active || ev.pointerId !== stickState.id) return;
      const rect = canvas.getBoundingClientRect();
      let dx = ev.clientX - rect.left - stickState.ox;
      let dy = ev.clientY - rect.top - stickState.oy;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      setKnob(dx, dy);
      const dead = 7;
      if (len < dead) {
        stickState.dx = 0;
        stickState.dy = 0;
      } else {
        const norm = Math.min(1, (len - dead) / (RADIUS - dead));
        const a = Math.atan2(dy, dx);
        stickState.dx = Math.cos(a) * norm;
        stickState.dy = Math.sin(a) * norm;
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== stickState.id) return;
      stickState.active = false;
      stickState.id = -1;
      stickState.dx = 0;
      stickState.dy = 0;
      stick.style.opacity = "0";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    // -------------------------------------------------------------- loop
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.2) dt = 0.2;

      if (stickState.active) {
        engine.input.x = stickState.dx;
        engine.input.y = stickState.dy;
      } else {
        let kx = 0;
        let ky = 0;
        keys.forEach((k) => {
          const m = MOVE_KEYS[k];
          if (m) {
            kx += m[0];
            ky += m[1];
          }
        });
        engine.input.x = Math.max(-1, Math.min(1, kx));
        engine.input.y = Math.max(-1, Math.min(1, ky));
      }

      if (runRef.current) {
        engine.update(dt);
      } else {
        engine.input.x = 0;
        engine.input.y = 0;
        if (ambientRef.current) engine.updateAmbient(dt);
      }

      // smooth follow camera (clamped; centres the ward when it all fits)
      const tx = vw >= WORLD_W ? WORLD_W / 2 : Math.min(Math.max(engine.player.x, vw / 2), WORLD_W - vw / 2);
      const ty = vh >= WORLD_H ? WORLD_H / 2 : Math.min(Math.max(engine.player.y, vh / 2), WORLD_H - vh / 2);
      const k = 1 - Math.exp(-9 * dt);
      camX += (tx - camX) * k;
      camY += (ty - camY) * k;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#04080d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const s = scale * dpr;
      ctx.setTransform(s, 0, 0, s, (cssW / 2 - camX * scale) * dpr, (cssH / 2 - camY * scale) * dpr);
      renderFrame(ctx, bg, engine, now / 1000, engine.cfg.shift, {
        x: camX - vw / 2,
        y: camY - vh / 2,
        w: vw,
        h: vh,
      });

      hudAcc += dt;
      const idle = engine.phase === "gameover" || engine.phase === "complete";
      if (hudAcc >= (idle ? 0.5 : 0.06)) {
        hudAcc = 0;
        hudRef.current(engine.snapshot());
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [engine]);

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        ref={stickRef}
        className="pointer-events-none absolute left-0 top-0 h-[104px] w-[104px] rounded-full border-2 border-cyan-300/40 bg-cyan-400/10 opacity-0 transition-opacity duration-150"
        style={{ willChange: "transform" }}
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/60 bg-cyan-300/30 shadow-[0_0_20px_rgba(103,232,249,0.45)]"
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100" />
        </div>
      </div>
    </div>
  );
}
