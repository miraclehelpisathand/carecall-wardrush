import {
  CALL_META,
  MESS,
  PLAYER,
  SAY,
  WORLD_H,
  WORLD_W,
  clamp,
  pick,
  rand,
  type CallKind,
  type CarryKind,
  type Shift,
  type TaskKind,
} from "./constants";
import {
  BED_LANES,
  CORRIDOR_A,
  CORRIDOR_B,
  PANTRY,
  ROAM_AREAS,
  ROOMS,
  SOLIDS,
  STATION,
  STATION_ENTRY,
  WC,
  rectNear,
  resolveSolids,
  type Rect,
} from "./map";
import { buildLevel, callLimit, type LevelConfig } from "./levels";
import { sfx } from "./audio";

export type Phase = "briefing" | "active" | "allclear" | "complete" | "gameover";

export interface ActiveCall {
  id: number;
  roomId: number;
  kind: CallKind;
  task: TaskKind;
  limit: number;
  remaining: number;
  progress: number;
  state: "waiting" | "escort";
  age: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 0 | 1 | 2; // 0 spark, 1 ring, 2 puff
  spin: number;
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

export interface Bed {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  speed: number;
  vertical: boolean;
  pause: number;
  wobble: number;
}

export interface Resident {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  wait: number;
  speed: number;
  anim: number;
  hue: number;
  frame: boolean;
  stuck: number;
}

export interface Escort {
  x: number;
  y: number;
  anim: number;
  callId: number;
  hue: number;
  urgency: number;
}

/** A patient occupying a ward bed. One per room, always present. */
export interface Patient {
  roomId: number;
  hue: number;
  anim: number;
  sit: number; // 0 = lying down, 1 = sat bolt upright calling
  wave: number;
  speech: { text: string; t: number; max: number } | null;
  inBed: boolean;
}

/** A puddle left behind when a toilet escort doesn't make it. */
export interface Mess {
  x: number;
  y: number;
  clean: number;
  age: number;
  seed: number;
}

export interface LevelStats {
  cleared: number;
  missed: number;
  accidents: number;
  cleaned: number;
  bonus: number;
  startScore: number;
  perfect: boolean;
}

export interface HudCall {
  id: number;
  kind: CallKind;
  task: TaskKind;
  room: string;
  remaining: number;
  limit: number;
  state: "waiting" | "escort";
}

export interface Hud {
  phase: Phase;
  level: number;
  wardName: string;
  shift: Shift;
  score: number;
  lives: number;
  combo: number;
  mult: number;
  carry: CarryKind;
  dashReady: number;
  calls: HudCall[];
  briefT: number;
  toast: { text: string; color: string; t: number } | null;
  stats: LevelStats;
  totals: { cleared: number; missed: number; bestCombo: number };
  needKeys: boolean;
  needTray: boolean;
  needMop: boolean;
  messes: number;
  escorting: boolean;
  escortUrgency: number;
  shiftDone: number;
  shiftTotal: number;
}

const MAX_PARTICLES = 320;

export class Engine {
  phase: Phase = "briefing";
  cfg: LevelConfig = buildLevel(1);
  level = 1;
  score = 0;
  lives = 3;
  combo = 0;
  bestCombo = 0;
  totalCleared = 0;
  totalMissed = 0;
  time = 0;
  levelTime = 0;
  briefT = 2.2;
  hitstop = 0;
  shake = 0;
  flash = 0;
  flashColor = "#ff3355";
  edgePulse = 0;
  edgeColor = "#ff3355";

  player = {
    x: STATION_ENTRY.x,
    y: STATION_ENTRY.y,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 1,
    anim: 0,
    dash: 0,
    dashCd: 0,
    stun: 0,
    carry: "none" as CarryKind,
    crowded: 0,
    bob: 0,
  };

  input = { x: 0, y: 0 };
  private dashQueued = false;

  calls: ActiveCall[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  beds: Bed[] = [];
  residents: Resident[] = [];
  patients: Patient[] = [];
  messes: Mess[] = [];
  escort: Escort | null = null;

  stats: LevelStats = { cleared: 0, missed: 0, accidents: 0, cleaned: 0, bonus: 0, startScore: 0, perfect: true };
  toast: { text: string; color: string; t: number } | null = null;

  private spawnCursor = 0;
  private spawnClock = 0;
  private seq = 1;
  private excuseCd = 0;

  constructor() {
    this.resetLevel(1);
    this.demo();
  }

  /** Populate the ward with idle traffic for the title screen backdrop. */
  demo() {
    this.cfg = { ...this.cfg, bedCount: 2, residents: 5, bedSpeed: 130, residentSpeed: 46 };
    this.spawnBeds();
    this.spawnResidents();
    this.toast = null;
  }

  // ---------------------------------------------------------------- lifecycle
  startRun(level: number) {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.bestCombo = 0;
    this.totalCleared = 0;
    this.totalMissed = 0;
    this.resetLevel(level);
  }

  resetLevel(level: number) {
    this.level = clamp(level, 1, 50);
    this.cfg = buildLevel(this.level);
    this.calls = [];
    this.particles.length = 0;
    this.texts.length = 0;
    this.messes.length = 0;
    this.escort = null;
    this.spawnPatients();
    this.spawnCursor = 0;
    this.spawnClock = 0;
    this.levelTime = 0;
    this.phase = "briefing";
    this.briefT = 1.6;
    this.shake = 0;
    this.flash = 0;
    this.hitstop = 0;
    this.stats = { cleared: 0, missed: 0, accidents: 0, cleaned: 0, bonus: 0, startScore: this.score, perfect: true };
    this.player.x = STATION_ENTRY.x;
    this.player.y = STATION_ENTRY.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.stun = 0;
    this.player.dash = 0;
    this.player.dashCd = 0;
    this.player.carry = "none";
    this.spawnBeds();
    this.spawnResidents();
    this.toast = { text: `${this.cfg.wardName}`, color: "#7fdcff", t: 2.4 };
  }

  nextLevel() {
    if (this.level >= 50) {
      this.phase = "gameover";
      return;
    }
    this.resetLevel(this.level + 1);
  }

  private spawnBeds() {
    this.beds = [];
    for (let i = 0; i < this.cfg.bedCount; i++) {
      const laneY = BED_LANES.horizontal[i % BED_LANES.horizontal.length];
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = this.cfg.bedSpeed * rand(0.85, 1.15);
      const slot = Math.floor(i / BED_LANES.horizontal.length);
      this.beds.push({
        x: clamp(200 + slot * 420 + rand(-60, 60), 160, WORLD_W - 160),
        y: laneY,
        w: 104,
        h: 52,
        vx: dir * speed,
        vy: 0,
        speed,
        vertical: false,
        pause: 0,
        wobble: Math.random() * 6,
      });
    }
    for (let i = 0; i < this.cfg.bedVertical; i++) {
      const laneX = BED_LANES.vertical[i % BED_LANES.vertical.length];
      const speed = this.cfg.bedSpeed * rand(0.8, 1.05);
      this.beds.push({
        x: laneX,
        y: rand(CORRIDOR_A.y + 60, CORRIDOR_B.y + CORRIDOR_B.h - 60),
        w: 52,
        h: 104,
        vx: 0,
        vy: (Math.random() < 0.5 ? -1 : 1) * speed,
        speed,
        vertical: true,
        pause: 0,
        wobble: Math.random() * 6,
      });
    }
  }

  /** One patient per bed, for the whole shift. */
  private spawnPatients() {
    this.patients = ROOMS.map((r) => ({
      roomId: r.id,
      hue: pick([26, 34, 200, 320, 12, 260, 160]),
      anim: Math.random() * 10,
      sit: 0,
      wave: 0,
      speech: null,
      inBed: true,
    }));
  }

  /** Give a room's patient a line of dialogue. */
  say(roomId: number, bank: keyof typeof SAY | string, dur = 2.4) {
    const p = this.patients.find((q) => q.roomId === roomId);
    if (!p) return;
    const lines = SAY[bank as string];
    if (!lines) return;
    p.speech = { text: pick(lines), t: dur, max: dur };
  }

  private spawnResidents() {
    this.residents = [];
    for (let i = 0; i < this.cfg.residents; i++) {
      const area = pick(ROAM_AREAS);
      const x = rand(area.x, area.x + area.w);
      const y = rand(area.y, area.y + area.h);
      this.residents.push({
        x,
        y,
        vx: 0,
        vy: 0,
        tx: x,
        ty: y,
        wait: rand(0, 2),
        speed: this.cfg.residentSpeed * rand(0.8, 1.2),
        anim: Math.random() * 10,
        hue: pick([26, 34, 200, 320, 12, 260]),
        frame: Math.random() < 0.45,
        stuck: 0,
      });
    }
  }

  queueDash() {
    this.dashQueued = true;
  }

  // ------------------------------------------------------------------ helpers
  private addParticles(
    x: number,
    y: number,
    n: number,
    color: string,
    opt: { speed?: number; life?: number; size?: number; kind?: 0 | 1 | 2; spread?: number; angle?: number } = {},
  ) {
    const speed = opt.speed ?? 180;
    const life = opt.life ?? 0.5;
    const size = opt.size ?? 3;
    const kind = opt.kind ?? 0;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const a = opt.angle !== undefined ? opt.angle + rand(-(opt.spread ?? 0.6), opt.spread ?? 0.6) : rand(0, Math.PI * 2);
      const s = speed * rand(0.35, 1);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * rand(0.7, 1.2),
        max: life,
        size: size * rand(0.7, 1.4),
        color,
        kind,
        spin: rand(-8, 8),
      });
    }
  }

  private addRing(x: number, y: number, color: string, size = 10, life = 0.45) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx: 0, vy: 0, life, max: life, size, color, kind: 1, spin: 0 });
  }

  private addText(x: number, y: number, text: string, color: string, size = 18) {
    if (this.texts.length > 26) this.texts.shift();
    this.texts.push({ x, y, vy: -46, life: 1.05, max: 1.05, text, color, size });
  }

  private setToast(text: string, color: string, t = 1.8) {
    this.toast = { text, color, t };
  }

  private kick(amount: number, color: string, stop = 0) {
    this.shake = Math.max(this.shake, amount);
    this.flash = Math.max(this.flash, Math.min(0.7, amount / 34));
    this.flashColor = color;
    if (stop > 0) this.hitstop = Math.max(this.hitstop, stop);
  }

  get mult() {
    return Math.min(5, 1 + this.combo * 0.2);
  }

  // ------------------------------------------------------------------- update
  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 1 / 30);
    if (this.phase === "complete" || this.phase === "gameover") {
      this.updateParticles(dt);
      this.decayFx(dt);
      return;
    }

    let scale = 1;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      scale = 0.2;
    }
    const d = dt * scale;
    this.time += d;

    if (this.phase === "briefing") {
      this.briefT -= dt;
      if (this.briefT <= 0) {
        this.phase = "active";
        this.setToast("SHIFT STARTED", "#7fdcff", 1.2);
      }
    } else {
      this.levelTime += d;
    }

    this.updatePlayer(d);
    this.updateBeds(d);
    this.updateResidents(d);
    this.updatePatients(d);
    this.updateMesses(d);
    this.updateEscort(d);
    if (this.phase === "active") {
      this.updateSpawns(d);
      this.updateCalls(d);
      if (this.spawnCursor >= this.cfg.spawns.length && this.calls.length === 0) {
        this.phase = "allclear";
        this.setToast("ALL CLEAR — RETURN TO STATION", "#7bffb0", 3);
        sfx.bonus();
      }
    } else if (this.phase === "allclear") {
      this.updateCalls(d);
      if (rectNear(this.player.x, this.player.y, STATION, PLAYER.radius + 22)) {
        this.completeLevel();
      }
    }

    this.updateParticles(d);
    this.decayFx(dt);
  }

  /** Menu / attract-mode: keep the ward alive without running the shift. */
  updateAmbient(dtRaw: number) {
    const d = Math.min(dtRaw, 1 / 30);
    this.time += d;
    this.updateBeds(d, false);
    this.updateResidents(d);
    this.updatePatients(d);
    this.updateParticles(d);
    this.shake = Math.max(0, this.shake - d * 58);
    this.flash = Math.max(0, this.flash - d * 2.4);
  }

  private decayFx(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 58);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.edgePulse = Math.max(0, this.edgePulse - dt * 1.6);
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
    this.excuseCd = Math.max(0, this.excuseCd - dt);
  }

  private updatePlayer(d: number) {
    const p = this.player;
    p.dashCd = Math.max(0, p.dashCd - d);
    p.crowded = Math.max(0, p.crowded - d * 3);

    if (p.stun > 0) {
      p.stun -= d;
      p.vx *= 0.86;
      p.vy *= 0.86;
    } else {
      let ix = this.input.x;
      let iy = this.input.y;
      const mag = Math.hypot(ix, iy);
      if (mag > 1) {
        ix /= mag;
        iy /= mag;
      }
      const unit = Math.min(mag, 1);
      if (unit > 0.08) {
        p.fx = ix / unit;
        p.fy = iy / unit;
      }

      if (this.dashQueued && p.dashCd <= 0 && this.phase !== "complete") {
        p.dash = PLAYER.dashTime;
        p.dashCd = PLAYER.dashCooldown;
        const a = Math.atan2(p.fy, p.fx);
        this.addParticles(p.x - p.fx * 12, p.y - p.fy * 12, 12, "#bfe9ff", {
          speed: 210,
          life: 0.4,
          size: 3,
          angle: a + Math.PI,
          spread: 0.7,
        });
        this.addRing(p.x, p.y, "#9fe6ff", 16, 0.32);
        sfx.dash();
      }
      this.dashQueued = false;

      let speed = PLAYER.speed;
      if (p.carry !== "none") speed *= PLAYER.carryMul;
      if (this.escort) speed *= PLAYER.escortMul;
      if (p.crowded > 0) speed *= 0.62;

      if (p.dash > 0) {
        p.dash -= d;
        p.vx = p.fx * PLAYER.dashSpeed;
        p.vy = p.fy * PLAYER.dashSpeed;
        if (Math.random() < 0.7)
          this.addParticles(p.x, p.y + 8, 1, "#dff4ff", { speed: 40, life: 0.28, size: 4, kind: 2 });
      } else {
        const tx = ix * speed;
        const ty = iy * speed;
        const ax = tx - p.vx;
        const ay = ty - p.vy;
        const rate = (mag > 0.08 ? PLAYER.accel : PLAYER.friction) * d;
        const al = Math.hypot(ax, ay) || 1;
        const step = Math.min(al, rate);
        p.vx += (ax / al) * step;
        p.vy += (ay / al) * step;
      }
    }

    this.dashQueued = false;
    p.x += p.vx * d;
    p.y += p.vy * d;
    p.x = clamp(p.x, PLAYER.radius, WORLD_W - PLAYER.radius);
    p.y = clamp(p.y, PLAYER.radius, WORLD_H - PLAYER.radius);
    resolveSolids(p, PLAYER.radius, SOLIDS);
    const sp = Math.hypot(p.vx, p.vy);
    p.anim += d * (0.6 + sp / 90);
    p.bob = Math.sin(p.anim * 6) * (sp > 20 ? 1 : 0);

    // pickups
    if (p.stun <= 0) {
      const needKeys = this.calls.some((c) => c.kind === "keys" && c.state === "waiting");
      const needTray = this.calls.some((c) => c.task === "meal" && c.state === "waiting");
      const atStation = rectNear(p.x, p.y, STATION, PLAYER.radius + 20);
      if (needKeys && p.carry !== "keys" && atStation) {
        p.carry = "keys";
        this.addText(p.x, p.y - 26, "KEYS", "#d9adff", 16);
        this.addRing(p.x, p.y, "#b061ff", 14, 0.4);
        sfx.pickup();
      } else if (this.messes.length > 0 && !needKeys && p.carry !== "mop" && atStation) {
        p.carry = "mop";
        this.addText(p.x, p.y - 26, "MOP", "#8ce8ff", 16);
        this.addRing(p.x, p.y, "#8ce8ff", 14, 0.4);
        sfx.pickup();
      } else if (needTray && p.carry !== "tray" && rectNear(p.x, p.y, PANTRY, PLAYER.radius + 20)) {
        p.carry = "tray";
        this.addText(p.x, p.y - 26, "MEAL TRAY", "#ffe08a", 16);
        this.addRing(p.x, p.y, "#ffb020", 14, 0.4);
        sfx.pickup();
      }
    }
  }

  private updateBeds(d: number, hitPlayer = true) {
    const p = this.player;
    // traffic: beds sharing a lane bounce off each other
    for (let i = 0; i < this.beds.length; i++) {
      for (let j = i + 1; j < this.beds.length; j++) {
        const a = this.beds[i];
        const c = this.beds[j];
        if (a.vertical !== c.vertical) continue;
        if (a.vertical) {
          if (Math.abs(a.x - c.x) > 6) continue;
          const dy = c.y - a.y;
          if (Math.abs(dy) < a.h + 14 && (c.vy - a.vy) * dy < 0) {
            a.vy = -a.vy;
            c.vy = -c.vy;
          }
        } else {
          if (Math.abs(a.y - c.y) > 6) continue;
          const dx = c.x - a.x;
          if (Math.abs(dx) < a.w + 14 && (c.vx - a.vx) * dx < 0) {
            a.vx = -a.vx;
            c.vx = -c.vx;
          }
        }
      }
    }
    for (const b of this.beds) {
      if (b.pause > 0) {
        b.pause -= d;
      } else if (b.vertical) {
        b.y += b.vy * d;
        const top = CORRIDOR_A.y + b.h / 2 + 6;
        const bot = CORRIDOR_B.y + CORRIDOR_B.h - b.h / 2 - 6;
        if (b.y < top) {
          b.y = top;
          b.vy = Math.abs(b.vy);
          if (this.level > 18 && Math.random() < 0.4) b.pause = rand(0.4, 1.2);
        }
        if (b.y > bot) {
          b.y = bot;
          b.vy = -Math.abs(b.vy);
          if (this.level > 18 && Math.random() < 0.4) b.pause = rand(0.4, 1.2);
        }
      } else {
        b.x += b.vx * d;
        const left = 60 + b.w / 2;
        const right = WORLD_W - 60 - b.w / 2;
        if (b.x < left) {
          b.x = left;
          b.vx = Math.abs(b.vx);
          if (this.level > 14 && Math.random() < 0.35) b.pause = rand(0.3, 1.1);
        }
        if (b.x > right) {
          b.x = right;
          b.vx = -Math.abs(b.vx);
          if (this.level > 14 && Math.random() < 0.35) b.pause = rand(0.3, 1.1);
        }
      }
      b.wobble += d * 8;

      // squash residents aside
      for (const r of this.residents) {
        const hw = b.w / 2 + 12;
        const hh = b.h / 2 + 12;
        const dx = r.x - b.x;
        const dy = r.y - b.y;
        if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
          if (b.vertical) r.x += Math.sign(dx || 1) * 90 * d;
          else r.y += Math.sign(dy || 1) * 90 * d;
        }
      }

      if (hitPlayer && p.stun <= 0) {
        const hw = b.w / 2 + PLAYER.radius * 0.75;
        const hh = b.h / 2 + PLAYER.radius * 0.75;
        if (Math.abs(p.x - b.x) < hw && Math.abs(p.y - b.y) < hh) this.bedHit(b);
      }
    }
  }

  private bedHit(b: Bed) {
    const p = this.player;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    p.vx = nx * 420 + b.vx * 0.4;
    p.vy = ny * 420 + b.vy * 0.4;
    p.stun = PLAYER.stunTime;
    p.dash = 0;
    this.combo = Math.max(0, this.combo - 2);
    this.kick(22, "#ffffff", 0.09);
    this.addParticles(p.x, p.y, 16, "#ffd9a0", { speed: 260, life: 0.5, size: 4 });
    this.addRing(p.x, p.y, "#ffffff", 12, 0.4);
    this.addText(p.x, p.y - 30, "OOF!", "#ffd166", 20);
    if (p.carry !== "none") {
      this.addText(p.x + 20, p.y - 10, "DROPPED", "#ff9db1", 14);
      p.carry = "none";
    }
    sfx.hit();
  }

  private retarget(r: Resident) {
    // mostly stay in the area you are already in, so nobody paths through a wall
    let area = ROAM_AREAS.find((a) => r.x >= a.x - 20 && r.x <= a.x + a.w + 20 && r.y >= a.y - 30 && r.y <= a.y + a.h + 30);
    if (!area || Math.random() < 0.22) area = pick(ROAM_AREAS);
    r.tx = rand(area.x, area.x + area.w);
    r.ty = rand(area.y, area.y + area.h);
  }

  private updateResidents(d: number) {
    const p = this.player;
    for (const r of this.residents) {
      if (r.wait > 0) {
        r.wait -= d;
        r.vx *= 0.9;
        r.vy *= 0.9;
      } else {
        const dx = r.tx - r.x;
        const dy = r.ty - r.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 14) {
          this.retarget(r);
          r.wait = rand(0.3, 2.2);
          r.stuck = 0;
        } else {
          r.vx = (dx / dist) * r.speed;
          r.vy = (dy / dist) * r.speed;
        }
      }
      const px = r.x;
      const py = r.y;
      r.x += r.vx * d;
      r.y += r.vy * d;
      r.anim += d * (2 + Math.hypot(r.vx, r.vy) / 26);
      resolveSolids(r, 13, SOLIDS);
      if (r.wait <= 0) {
        const moved = Math.hypot(r.x - px, r.y - py);
        r.stuck = moved < r.speed * d * 0.35 ? r.stuck + d : 0;
        if (r.stuck > 0.9) {
          this.retarget(r);
          r.stuck = 0;
          r.wait = rand(0.1, 0.5);
        }
      }

      const dx = p.x - r.x;
      const dy = p.y - r.y;
      const dd = Math.hypot(dx, dy);
      const minD = PLAYER.radius + 13;
      if (dd < minD && dd > 0.001) {
        const push = (minD - dd) / dd;
        r.x -= dx * push * 0.65;
        r.y -= dy * push * 0.65;
        p.x += dx * push * 0.35;
        p.y += dy * push * 0.35;
        this.player.crowded = 1;
        if (this.excuseCd <= 0) {
          this.excuseCd = 1.6;
          this.addText(r.x, r.y - 26, pick(["EXCUSE ME!", "MIND OUT!", "OOH!", "SORRY LOVE"]), "#ffe6a8", 13);
          this.addParticles(r.x, r.y, 4, "#ffe6a8", { speed: 70, life: 0.35, size: 2 });
        }
      }
    }
  }

  private updatePatients(d: number) {
    for (const p of this.patients) {
      p.anim += d;
      const call = this.calls.find((c) => c.roomId === p.roomId);
      const calling = !!call && call.state === "waiting";
      // sit up while calling, settle back once answered
      p.sit += ((calling ? 1 : 0) - p.sit) * Math.min(1, d * 6);
      p.wave = calling ? p.wave + d * 7 : 0;
      p.inBed = !(call && call.state === "escort");
      if (p.speech) {
        p.speech.t -= d;
        if (p.speech.t <= 0) p.speech = null;
      }
      // occasional repeat nag while still waiting
      if (calling && !p.speech && call && call.age > 2.5 && Math.random() < d * 0.32) {
        const bank = call.task !== "none" ? call.task : call.kind;
        this.say(p.roomId, bank, 2.2);
      }
    }
  }

  private addMess(x: number, y: number) {
    this.messes.push({ x, y, clean: 0, age: 0, seed: Math.random() * 100 });
    this.addParticles(x, y, 16, "#e3d46a", { speed: 150, life: 0.6, size: 3.4 });
    this.addRing(x, y, "#e3d46a", 12, 0.5);
  }

  private updateMesses(d: number) {
    const p = this.player;
    const speed = Math.hypot(p.vx, p.vy);
    for (let i = this.messes.length - 1; i >= 0; i--) {
      const m = this.messes[i];
      m.age += d;
      const dist = Math.hypot(p.x - m.x, p.y - m.y);

      if (p.carry === "mop" && dist < MESS.radius + 14 && p.stun <= 0) {
        m.clean += d / MESS.cleanTime;
        if (Math.random() < 0.6)
          this.addParticles(m.x + rand(-14, 14), m.y + rand(-10, 10), 1, "#bfe9ff", {
            speed: 50,
            life: 0.4,
            size: 2.4,
          });
        if (m.clean >= 1) {
          this.messes.splice(i, 1);
          const pts = Math.round(MESS.points * this.mult);
          this.score += pts;
          this.stats.cleaned++;
          this.addText(m.x, m.y - 22, `+${pts} CLEANED`, "#8ce8ff", 18);
          this.addParticles(m.x, m.y, 18, "#8ce8ff", { speed: 220, life: 0.55, size: 3 });
          this.addRing(m.x, m.y, "#8ce8ff", 12, 0.45);
          this.kick(7, "#8ce8ff");
          sfx.bonus();
          if (!this.messes.length && this.player.carry === "mop") this.player.carry = "none";
        }
        continue;
      }
      m.clean = Math.max(0, m.clean - d * 0.6);

      // slip if you sprint through it without a mop
      if (p.stun <= 0 && p.carry !== "mop" && dist < MESS.radius - 4 && speed > MESS.slipSpeed) {
        p.stun = PLAYER.stunTime * 1.2;
        p.dash = 0;
        const a = Math.atan2(p.vy, p.vx) + rand(-0.6, 0.6);
        p.vx = Math.cos(a) * 300;
        p.vy = Math.sin(a) * 300;
        this.combo = Math.max(0, this.combo - 1);
        this.addText(p.x, p.y - 30, "SLIP!", "#ffe27a", 20);
        this.addParticles(p.x, p.y, 12, "#e3d46a", { speed: 200, life: 0.5, size: 3 });
        this.kick(16, "#ffe27a", 0.06);
        if (p.carry !== "none") {
          this.addText(p.x + 22, p.y - 8, "DROPPED", "#ff9db1", 13);
          p.carry = "none";
        }
        sfx.hit();
      }
    }
  }

  private updateEscort(d: number) {
    const e = this.escort;
    if (!e) return;
    const p = this.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    const follow = 34;
    if (dist > follow) {
      const speed = Math.min(230, 130 + (dist - follow) * 3);
      e.x += (dx / dist) * speed * d;
      e.y += (dy / dist) * speed * d;
      e.anim += d * 6;
      resolveSolids(e, 12, SOLIDS);
    }
    const call = this.calls.find((c) => c.id === e.callId);
    e.urgency = call ? 1 - clamp(call.remaining / call.limit, 0, 1) : 0;
    // they get vocal as it gets desperate
    if (call && e.urgency > 0.45 && Math.random() < d * 0.5) this.say(call.roomId, "escort", 1.6);
    if (rectNear(e.x, e.y, WC, 42) && rectNear(p.x, p.y, WC, PLAYER.radius + 24)) {
      if (call) this.clearCall(call, true);
      this.escort = null;
    }
  }

  /** Escort ran out of time — accident on the floor, needs a mop. */
  private accident(c: ActiveCall) {
    const idx = this.calls.indexOf(c);
    if (idx >= 0) this.calls.splice(idx, 1);
    const e = this.escort;
    const x = e ? e.x : ROOMS[c.roomId - 1].callPoint.x;
    const y = e ? e.y : ROOMS[c.roomId - 1].callPoint.y;
    this.escort = null;
    this.combo = 0;
    this.stats.accidents++;
    this.stats.perfect = false;
    this.addMess(x, y);
    this.addText(x, y - 34, "ACCIDENT!", "#ffe27a", 20);
    this.say(c.roomId, "accident", 2.6);
    this.setToast("ACCIDENT — GRAB A MOP FROM THE STATION", "#e3d46a", 3);
    this.kick(20, "#e3d46a", 0.08);
    sfx.fail();
  }

  private updateSpawns(d: number) {
    if (this.calls.length < this.cfg.maxConcurrent) this.spawnClock += d;
    while (this.spawnCursor < this.cfg.spawns.length && this.spawnClock >= this.cfg.spawns[this.spawnCursor].t) {
      if (this.calls.length >= this.cfg.maxConcurrent) break;
      const def = this.cfg.spawns[this.spawnCursor];
      this.spawnCursor++;
      this.spawnCall(def.kind, def.task);
    }
  }

  private spawnCall(kind: CallKind, task: TaskKind) {
    const used = new Set(this.calls.map((c) => c.roomId));
    let free = ROOMS.filter((r) => !used.has(r.id));
    if (!free.length) return;
    if (this.level >= 8 && free.length > 3) {
      const p = this.player;
      free = free
        .map((r) => ({ r, d: Math.hypot(r.callPoint.x - p.x, r.callPoint.y - p.y) }))
        .sort((a, b) => b.d - a.d)
        .slice(0, Math.max(3, Math.ceil(free.length * 0.6)))
        .map((o) => o.r);
    }
    const room = pick(free);
    const limit = callLimit(this.cfg, kind, task);
    this.calls.push({
      id: this.seq++,
      roomId: room.id,
      kind,
      task,
      limit,
      remaining: limit,
      progress: 0,
      state: "waiting",
      age: 0,
    });
    const meta = CALL_META[kind];
    this.say(room.id, task !== "none" ? task : kind, 2.6);
    this.addRing(room.lamp.x, room.lamp.y, meta.color, 18, 0.6);
    this.addParticles(room.lamp.x, room.lamp.y, 8, meta.color, { speed: 90, life: 0.5, size: 3 });
    this.setToast(`RM ${room.label} — ${meta.label}${task !== "none" ? " +TASK" : ""}`, meta.color, 1.7);
    if (kind === "emergency") this.kick(9, meta.color);
    sfx.call(kind);
  }

  private updateCalls(d: number) {
    const p = this.player;
    for (let i = this.calls.length - 1; i >= 0; i--) {
      const c = this.calls[i];
      c.age += d;
      const room = ROOMS[c.roomId - 1];

      // escorting: they can only hold on for so long
      if (c.state === "escort") {
        c.remaining -= d;
        if (c.remaining / c.limit < 0.35) {
          this.edgePulse = Math.max(this.edgePulse, 0.45);
          this.edgeColor = "#e3d46a";
          sfx.tick();
        }
        if (c.remaining <= 0) this.accident(c);
        continue;
      }

      c.remaining -= d;
      const frac = c.remaining / c.limit;
      if (frac < 0.3) {
        this.edgePulse = Math.max(this.edgePulse, 0.55);
        this.edgeColor = CALL_META[c.kind].color;
        sfx.tick();
      }
      if (c.remaining <= 0) {
        this.missCall(c, i);
        continue;
      }

      const dist = Math.hypot(p.x - room.callPoint.x, p.y - room.callPoint.y);
      let allowed = p.stun <= 0 && dist < 46;
      if (allowed && c.kind === "keys" && p.carry !== "keys") {
        allowed = false;
        if (this.excuseCd <= 0) {
          this.excuseCd = 1.4;
          this.addText(p.x, p.y - 30, "NEED KEYS!", "#d9adff", 15);
        }
      }
      if (allowed && c.task === "meal" && p.carry !== "tray") {
        allowed = false;
        if (this.excuseCd <= 0) {
          this.excuseCd = 1.4;
          this.addText(p.x, p.y - 30, "GET A TRAY!", "#ffd88a", 15);
        }
      }
      if (allowed) {
        c.progress += d / CALL_META[c.kind].reset;
        if (Math.random() < 0.5)
          this.addParticles(room.callPoint.x, room.callPoint.y, 1, CALL_META[c.kind].color, {
            speed: 60,
            life: 0.35,
            size: 2.5,
          });
        if (c.progress >= 1) {
          if (c.task === "toilet") {
            c.state = "escort";
            c.progress = 1;
            // fresh clock for the walk to the WC — generous, but it ticks
            c.limit = clamp(20 - this.level * 0.12, 12, 20);
            c.remaining = c.limit;
            const pat = this.patients.find((q) => q.roomId === c.roomId);
            this.escort = {
              x: room.callPoint.x,
              y: room.callPoint.y + 18,
              anim: 0,
              callId: c.id,
              hue: pat ? pat.hue : pick([26, 200, 320]),
              urgency: 0,
            };
            this.addText(p.x, p.y - 34, "ESCORT TO WC", "#ffd88a", 16);
            this.setToast("ESCORT THE RESIDENT TO THE WC", "#ffb020", 2.4);
            this.addRing(room.callPoint.x, room.callPoint.y, "#ffb020", 16, 0.5);
            this.say(c.roomId, "toilet", 2);
            sfx.pickup();
          } else {
            this.clearCall(c, false);
          }
        }
      } else {
        c.progress = Math.max(0, c.progress - d * 1.8);
      }
    }
  }

  private clearCall(c: ActiveCall, bonusTask: boolean) {
    const idx = this.calls.indexOf(c);
    if (idx >= 0) this.calls.splice(idx, 1);
    const meta = CALL_META[c.kind];
    const room = ROOMS[c.roomId - 1];
    const speedBonus = 1 + Math.max(0, c.remaining / c.limit) * 0.6;
    let pts = Math.round(meta.points * this.mult * speedBonus);
    if (bonusTask) pts += 180;
    if (c.task === "meal") pts += 90;
    this.score += pts;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.stats.cleared++;
    this.totalCleared++;

    if (c.kind === "keys" && this.player.carry === "keys") this.player.carry = "none";
    if (c.task === "meal" && this.player.carry === "tray") this.player.carry = "none";
    this.say(c.roomId, "thanks", 2);

    const px = bonusTask ? this.player.x : room.callPoint.x;
    const py = bonusTask ? this.player.y : room.callPoint.y;
    this.addParticles(px, py, 22, meta.color, { speed: 300, life: 0.6, size: 3.6 });
    this.addParticles(px, py, 10, "#ffffff", { speed: 160, life: 0.4, size: 2.4 });
    this.addRing(px, py, meta.color, 14, 0.5);
    this.addRing(px, py, "#ffffff", 8, 0.35);
    this.addText(px, py - 26, `+${pts}`, meta.color, 22);
    if (this.combo > 1) this.addText(px + 34, py - 4, `x${this.mult.toFixed(1)}`, "#ffe27a", 15);
    this.kick(this.combo > 4 ? 12 : 8, meta.color, c.kind === "emergency" ? 0.06 : 0);
    if (bonusTask) sfx.bonus();
    else sfx.clear();
  }

  private missCall(c: ActiveCall, index: number) {
    this.calls.splice(index, 1);
    const room = ROOMS[c.roomId - 1];
    this.lives -= 1;
    this.combo = 0;
    this.stats.missed++;
    this.stats.perfect = false;
    this.totalMissed++;
    if (this.escort && this.escort.callId === c.id) this.escort = null;
    this.kick(30, "#ff2f4f", 0.16);
    this.edgePulse = 1;
    this.edgeColor = "#ff2f4f";
    this.say(c.roomId, "missed", 2.4);
    this.addParticles(room.lamp.x, room.lamp.y, 20, "#ff5570", { speed: 250, life: 0.7, size: 4 });
    this.addText(room.lamp.x, room.lamp.y - 14, "MISSED!", "#ff5570", 22);
    this.setToast(`MISSED CALL — RM ${room.label}`, "#ff5570", 2.2);
    sfx.fail();
    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = "gameover";
      this.kick(38, "#ff2f4f", 0.3);
      sfx.gameOver();
    }
  }

  private completeLevel() {
    const clearBonus = 220 + this.level * 70;
    const lifeBonus = this.lives * 110;
    const perfect = this.stats.perfect ? 400 : 0;
    const spotless = this.messes.length === 0 ? 150 : -this.messes.length * MESS.endPenalty;
    const bonus = Math.max(0, clearBonus + lifeBonus + perfect + spotless);
    this.stats.bonus = bonus;
    this.score += bonus;
    this.phase = "complete";
    if (this.level % 10 === 0 && this.lives < 5) this.lives += 1;
    this.kick(14, "#7bffb0");
    for (let i = 0; i < 6; i++) {
      this.addParticles(
        STATION.x + rand(0, STATION.w),
        STATION.y + rand(0, STATION.h),
        6,
        pick(["#7bffb0", "#7fdcff", "#ffe27a", "#ffffff"]),
        { speed: 260, life: 0.9, size: 4 },
      );
    }
    sfx.levelUp();
  }

  private updateParticles(d: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= d;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.kind !== 1) {
        p.x += p.vx * d;
        p.y += p.vy * d;
        p.vx *= 1 - 3.2 * d;
        p.vy *= 1 - 3.2 * d;
        if (p.kind === 2) p.vy -= 24 * d;
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= d;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * d;
      t.vy *= 1 - 1.6 * d;
    }
  }

  // -------------------------------------------------------------------- query
  needsKeys(): boolean {
    return this.player.carry !== "keys" && this.calls.some((c) => c.kind === "keys" && c.state === "waiting");
  }

  needsTray(): boolean {
    return this.player.carry !== "tray" && this.calls.some((c) => c.task === "meal" && c.state === "waiting");
  }

  needsMop(): boolean {
    return this.messes.length > 0 && this.player.carry !== "mop" && !this.needsKeys();
  }

  nearestMess(): Mess | null {
    let best: Mess | null = null;
    let bd = Infinity;
    for (const m of this.messes) {
      const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  urgentCall(): ActiveCall | null {
    let best: ActiveCall | null = null;
    let bestScore = Infinity;
    for (const c of this.calls) {
      const s = c.state === "escort" ? 99 : c.remaining / c.limit + CALL_META[c.kind].priority * 0.02;
      if (s < bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return best;
  }

  callForRoom(roomId: number): ActiveCall | undefined {
    return this.calls.find((c) => c.roomId === roomId);
  }

  target(): { x: number; y: number; color: string } | null {
    const p = this.player;
    if (p.carry === "mop") {
      const m = this.nearestMess();
      if (m) return { x: m.x, y: m.y, color: "#8ce8ff" };
    }
    if (this.phase === "allclear" || this.phase === "complete") {
      if (this.messes.length)
        return { x: STATION.x + STATION.w / 2, y: STATION.y + STATION.h / 2, color: "#8ce8ff" };
      return { x: STATION.x + STATION.w / 2, y: STATION.y + STATION.h / 2, color: "#7bffb0" };
    }
    if (this.escort) return { x: WC.x + WC.w / 2, y: WC.y + WC.h / 2, color: "#ffb020" };
    const needKeys = this.calls.some((c) => c.kind === "keys" && c.state === "waiting");
    const needTray = this.calls.some((c) => c.task === "meal" && c.state === "waiting");
    if (needKeys && p.carry !== "keys") return { x: STATION.x + STATION.w / 2, y: STATION.y + STATION.h / 2, color: "#b061ff" };
    if (needTray && p.carry !== "tray" && this.calls.every((c) => c.task === "meal" || c.remaining / c.limit > 0.45))
      return { x: PANTRY.x + PANTRY.w / 2, y: PANTRY.y + PANTRY.h / 2, color: "#ffb020" };
    const c = this.urgentCall();
    if (!c) return null;
    const room = ROOMS[c.roomId - 1];
    return { x: room.callPoint.x, y: room.callPoint.y, color: CALL_META[c.kind].color };
  }

  snapshot(): Hud {
    const p = this.player;
    return {
      phase: this.phase,
      level: this.level,
      wardName: this.cfg.wardName,
      shift: this.cfg.shift,
      score: this.score,
      lives: this.lives,
      combo: this.combo,
      mult: this.mult,
      carry: p.carry,
      dashReady: 1 - p.dashCd / PLAYER.dashCooldown,
      briefT: this.briefT,
      toast: this.toast ? { ...this.toast } : null,
      stats: { ...this.stats },
      totals: { cleared: this.totalCleared, missed: this.totalMissed, bestCombo: this.bestCombo },
      needKeys: this.calls.some((c) => c.kind === "keys" && c.state === "waiting"),
      needTray: this.calls.some((c) => c.task === "meal" && c.state === "waiting"),
      needMop: this.messes.length > 0 && p.carry !== "mop",
      messes: this.messes.length,
      escorting: !!this.escort,
      escortUrgency: this.escort ? this.escort.urgency : 0,
      shiftDone: this.stats.cleared + this.stats.missed + this.stats.accidents,
      shiftTotal: this.cfg.spawns.length,
      calls: this.calls
        .slice()
        .sort((a, b) => {
          const pa = CALL_META[a.kind].priority - CALL_META[b.kind].priority;
          if (pa !== 0) return pa;
          return a.remaining - b.remaining;
        })
        .map((c) => ({
          id: c.id,
          kind: c.kind,
          task: c.task,
          room: ROOMS[c.roomId - 1].label,
          remaining: Math.max(0, c.remaining),
          limit: c.limit,
          state: c.state,
        })),
    };
  }
}

export type { Rect };
