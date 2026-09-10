import { CALL_META, SHIFT_META, THEME, WORLD_H, WORLD_W, clamp, type Shift } from "./constants";
import { LAYOUT, PANTRY, ROOMS, STATION, WC, type Rect } from "./map";
import type { Bed, Engine, Mess, Patient } from "./engine";

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function wall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = THEME.wall;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = THEME.wallTop;
  ctx.fillRect(x, y, w, Math.min(4, h));
  ctx.fillStyle = "rgba(50,70,84,0.35)";
  ctx.fillRect(x, y + h - 3, w, 3);
}

function tiles(ctx: CanvasRenderingContext2D, r: Rect, size: number, a: string, b: string) {
  ctx.fillStyle = a;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = b;
  const cols = Math.ceil(r.w / size);
  const rows = Math.ceil(r.h / size);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if ((i + j) % 2) continue;
      const x = r.x + i * size;
      const y = r.y + j * size;
      ctx.fillRect(x, y, Math.min(size, r.x + r.w - x), Math.min(size, r.y + r.h - y));
    }
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") {
  ctx.font = `600 ${size}px "Chakra Petch", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawBedFurniture(ctx: CanvasRenderingContext2D, r: Rect, headTop: boolean) {
  ctx.fillStyle = "rgba(20,40,55,0.16)";
  rr(ctx, r.x + 3, r.y + 5, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = "#f7fafc";
  rr(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = "#b9c8d2";
  ctx.lineWidth = 2;
  ctx.stroke();
  // mattress
  ctx.fillStyle = "#dfeaf2";
  rr(ctx, r.x + 6, r.y + 8, r.w - 12, r.h - 16, 6);
  ctx.fill();
  // blanket
  ctx.fillStyle = "#8fc3e8";
  const by = headTop ? r.y + r.h * 0.42 : r.y + 8;
  rr(ctx, r.x + 6, by, r.w - 12, r.h * 0.5, 6);
  ctx.fill();
  ctx.fillStyle = "#a9d4f2";
  ctx.fillRect(r.x + 6, by + 6, r.w - 12, 4);
  // pillow
  ctx.fillStyle = "#ffffff";
  const py = headTop ? r.y + 14 : r.y + r.h - 34;
  rr(ctx, r.x + 16, py, r.w - 32, 22, 8);
  ctx.fill();
}

export function renderStatic(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  // base corridor floor
  tiles(ctx, { x: 0, y: 0, w: WORLD_W, h: WORLD_H }, 40, THEME.corridor, THEME.corridorAlt);

  // wayfinding stripes down the corridors
  ctx.fillStyle = "rgba(90,170,205,0.22)";
  ctx.fillRect(LAYOUT.B, LAYOUT.CORR_A.y + LAYOUT.CORR_A.h / 2 - 4, WORLD_W - LAYOUT.B * 2, 5);
  ctx.fillRect(LAYOUT.B, LAYOUT.CORR_B.y + LAYOUT.CORR_B.h / 2 - 4, WORLD_W - LAYOUT.B * 2, 5);
  ctx.fillStyle = "rgba(120,200,160,0.18)";
  ctx.fillRect(LAYOUT.B, LAYOUT.CORR_A.y + LAYOUT.CORR_A.h / 2 + 3, WORLD_W - LAYOUT.B * 2, 3);
  ctx.fillRect(LAYOUT.B, LAYOUT.CORR_B.y + LAYOUT.CORR_B.h / 2 + 3, WORLD_W - LAYOUT.B * 2, 3);

  // rooms
  for (const room of ROOMS) {
    const f = room.floor;
    tiles(ctx, f, 40, THEME.roomFloor, THEME.roomFloorAlt);
    // skirting shade
    ctx.fillStyle = "rgba(120,150,170,0.18)";
    ctx.fillRect(f.x, f.y, f.w, 6);
    ctx.fillRect(f.x, f.y + f.h - 6, f.w, 6);

    drawBedFurniture(ctx, room.bed, room.side === "top");

    // bedside locker
    ctx.fillStyle = "rgba(20,40,55,0.14)";
    rr(ctx, room.locker.x + 2, room.locker.y + 4, room.locker.w, room.locker.h, 5);
    ctx.fill();
    ctx.fillStyle = "#c9a978";
    rr(ctx, room.locker.x, room.locker.y, room.locker.w, room.locker.h, 5);
    ctx.fill();
    ctx.fillStyle = "#e2c79b";
    ctx.fillRect(room.locker.x + 5, room.locker.y + 6, room.locker.w - 10, 5);

    // call point base plate on the wall
    const cp = room.callPoint;
    ctx.fillStyle = "rgba(20,40,55,0.18)";
    rr(ctx, cp.x - 12, cp.y - 16, 26, 36, 6);
    ctx.fill();
    ctx.fillStyle = "#f2f6f8";
    rr(ctx, cp.x - 13, cp.y - 18, 26, 36, 6);
    ctx.fill();
    ctx.strokeStyle = "#9fb2bf";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, "CARE", cp.x, cp.y + 11, 7, "#8fa3b0");

    // door threshold
    ctx.fillStyle = "rgba(120,160,185,0.35)";
    ctx.fillRect(room.door.x, room.door.y, room.door.w, room.door.h);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(room.door.x + 2, room.door.y + 2, room.door.w - 4, room.door.h - 4);

    // room plate in corridor
    const plateY = room.side === "top" ? room.door.y + 22 : room.door.y - 22;
    ctx.fillStyle = "rgba(30,55,70,0.85)";
    rr(ctx, room.plate.x - 22, plateY - 11, 44, 22, 5);
    ctx.fill();
    label(ctx, room.label, room.plate.x, plateY + 1, 14, "#bfe7ff");
  }

  // walls
  wall(ctx, 0, 0, WORLD_W, LAYOUT.B);
  wall(ctx, 0, WORLD_H - LAYOUT.B, WORLD_W, LAYOUT.B);
  wall(ctx, 0, 0, LAYOUT.B, WORLD_H);
  wall(ctx, WORLD_W - LAYOUT.B, 0, LAYOUT.B, WORLD_H);
  for (const room of ROOMS) {
    const f = room.floor;
    const wy = room.side === "top" ? LAYOUT.TOP_WALL_Y : LAYOUT.BOT_WALL_Y;
    wall(ctx, f.x, wy, room.door.x - f.x, LAYOUT.WALL_T);
    wall(ctx, room.door.x + room.door.w, wy, f.x + f.w - (room.door.x + room.door.w), LAYOUT.WALL_T);
    if (room.id % 5 !== 1) wall(ctx, f.x - 10, f.y, 10, f.h);
  }

  // ---- island: pantry
  block(ctx, PANTRY, THEME.pantry, "#5b7789");
  ctx.fillStyle = "#8ea8b8";
  ctx.fillRect(PANTRY.x + 16, PANTRY.y + PANTRY.h - 30, PANTRY.w - 32, 16);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? "#ffd27a" : "#ffe6b0";
    rr(ctx, PANTRY.x + 30 + i * 50, PANTRY.y + PANTRY.h - 27, 36, 10, 3);
    ctx.fill();
  }
  const pcx = PANTRY.x + PANTRY.w / 2;
  label(ctx, "PANTRY", pcx, PANTRY.y + 19, 15, "#d8ecf7");
  label(ctx, "MEALS + DRINKS", pcx, PANTRY.y + 34, 10, "rgba(216,236,247,0.58)");
  ctx.fillStyle = "rgba(216,236,247,0.2)";
  ctx.fillRect(pcx - 52, PANTRY.y + 42, 104, 1);
  // fridge
  ctx.fillStyle = "#cfe6f2";
  rr(ctx, PANTRY.x + 62, PANTRY.y + 50, 44, 32, 6);
  ctx.fill();
  ctx.fillStyle = "#9ec6dc";
  ctx.fillRect(PANTRY.x + 84, PANTRY.y + 56, 3, 20);
  // urn
  ctx.fillStyle = "#9ec6dc";
  rr(ctx, PANTRY.x + 118, PANTRY.y + 52, 30, 30, 6);
  ctx.fill();
  ctx.fillStyle = "#e6f2f8";
  rr(ctx, PANTRY.x + 126, PANTRY.y + 58, 14, 9, 3);
  ctx.fill();

  // ---- island: nurses station
  block(ctx, STATION, THEME.station, "#3f6f92");
  ctx.fillStyle = "#2c5474";
  rr(ctx, STATION.x + 14, STATION.y + 14, STATION.w - 28, STATION.h - 28, 10);
  ctx.fill();
  // monitors
  for (let i = 0; i < 3; i++) {
    const mx = STATION.x + 40 + i * 96;
    ctx.fillStyle = "#0d1c28";
    rr(ctx, mx, STATION.y + 22, 74, 42, 5);
    ctx.fill();
    ctx.fillStyle = i === 1 ? "rgba(120,255,190,0.5)" : "rgba(120,210,255,0.4)";
    ctx.fillRect(mx + 6, STATION.y + 28, 62, 6);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(mx + 6, STATION.y + 40, 40, 4);
    ctx.fillRect(mx + 6, STATION.y + 50, 52, 4);
  }
  // desk lip
  ctx.fillStyle = "#e7f1f6";
  rr(ctx, STATION.x + 16, STATION.y + STATION.h - 22, STATION.w - 32, 14, 6);
  ctx.fill();
  label(ctx, "NURSES STATION", STATION.x + STATION.w / 2, STATION.y + 80, 17, "#a9dcf7");
  // mop + bucket parked at the near end of the station
  ctx.strokeStyle = "#c9a978";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(STATION.x + 24, STATION.y + 30);
  ctx.lineTo(STATION.x + 30, STATION.y + 74);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#dfe9ef";
  rr(ctx, STATION.x + 22, STATION.y + 72, 18, 12, 5);
  ctx.fill();
  ctx.fillStyle = "#7fd7ff";
  rr(ctx, STATION.x + 42, STATION.y + 66, 20, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#2c5474";
  ctx.fillRect(STATION.x + 44, STATION.y + 70, 16, 3);

  // key rack
  ctx.fillStyle = "#1b3346";
  rr(ctx, STATION.x + STATION.w - 54, STATION.y + 22, 34, 42, 5);
  ctx.fill();
  ctx.strokeStyle = "#b061ff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(STATION.x + STATION.w - 45 + i * 9, STATION.y + 40, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---- island: WC
  // Layout bands: header (y+18) → fixtures (y+34..y+56) → door plate (y+h-30).
  block(ctx, WC, THEME.wc, "#4f7f96");
  const wcx = WC.x + WC.w / 2;
  label(ctx, "BATHROOM", wcx, WC.y + 19, 13, "rgba(222,242,251,0.82)");
  ctx.fillStyle = "rgba(222,242,251,0.22)";
  ctx.fillRect(wcx - 46, WC.y + 29, 92, 1);

  // mirror + basin
  ctx.fillStyle = "rgba(226,245,253,0.35)";
  rr(ctx, WC.x + 76, WC.y + 34, 28, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#d7eef8";
  ctx.beginPath();
  ctx.arc(WC.x + 90, WC.y + 64, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9fc4d6";
  ctx.beginPath();
  ctx.arc(WC.x + 90, WC.y + 64, 5, 0, Math.PI * 2);
  ctx.fill();

  // cubicle with grab rail
  ctx.fillStyle = "#d7eef8";
  rr(ctx, WC.x + 124, WC.y + 38, 36, 40, 7);
  ctx.fill();
  ctx.fillStyle = "#a8cbdd";
  rr(ctx, WC.x + 130, WC.y + 44, 24, 12, 4);
  ctx.fill();
  ctx.strokeStyle = "#ffd27a";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(WC.x + 168, WC.y + 42);
  ctx.lineTo(WC.x + 168, WC.y + 68);
  ctx.stroke();
  ctx.lineCap = "butt";

  // door plate
  ctx.fillStyle = "#e8f4fa";
  rr(ctx, wcx - 32, WC.y + WC.h - 30, 64, 22, 5);
  ctx.fill();
  label(ctx, "WC", wcx, WC.y + WC.h - 18, 15, "#26506b");
}

function block(ctx: CanvasRenderingContext2D, r: Rect, fill: string, edge: string) {
  ctx.fillStyle = "rgba(10,25,38,0.3)";
  rr(ctx, r.x + 4, r.y + 8, r.w, r.h, 12);
  ctx.fill();
  ctx.fillStyle = fill;
  rr(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  rr(ctx, r.x + 4, r.y + 4, r.w - 8, 12, 6);
  ctx.fill();
}

// ---------------------------------------------------------------- dynamic
let vignetteCache: { key: string; grad: CanvasGradient } | null = null;

/** Radial vignette centred on 0,0 sized for the given view. */
function vignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const key = `${Math.round(w / 8)}x${Math.round(h / 8)}`;
  if (!vignetteCache || vignetteCache.key !== key) {
    const r = Math.max(w, h);
    const g = ctx.createRadialGradient(0, 0, r * 0.22, 0, 0, r * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    vignetteCache = { key, grad: g };
  }
  return vignetteCache.grad;
}

const glowCache = new Map<string, CanvasGradient>();

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const key = `${color}|${r}`;
  let g = glowCache.get(key);
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color.startsWith("#") ? `${color}55` : color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    glowCache.set(key, g);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBed(ctx: CanvasRenderingContext2D, b: Bed, t: number) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const jitter = Math.sin(t * 18 + b.wobble) * 0.8;
  if (b.vertical) ctx.rotate(Math.PI / 2);
  const w = b.vertical ? b.h : b.w;
  const h = b.vertical ? b.w : b.h;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  rr(ctx, -w / 2 + 4, -h / 2 + 8, w, h, 9);
  ctx.fill();
  // frame
  ctx.fillStyle = "#eef4f8";
  rr(ctx, -w / 2, -h / 2 + jitter, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = "#8fa4b2";
  ctx.lineWidth = 2;
  ctx.stroke();
  // mattress + patient
  ctx.fillStyle = "#cfe0ec";
  rr(ctx, -w / 2 + 8, -h / 2 + 7 + jitter, w - 16, h - 14, 6);
  ctx.fill();
  ctx.fillStyle = "#7fb6de";
  rr(ctx, -w / 2 + 10, -h / 2 + 9 + jitter, w * 0.5, h - 18, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  rr(ctx, w / 2 - 30, -h / 2 + 11 + jitter, 20, h - 22, 6);
  ctx.fill();
  ctx.fillStyle = "#f3c9a6";
  ctx.beginPath();
  ctx.arc(w / 2 - 20, jitter, 8, 0, Math.PI * 2);
  ctx.fill();
  // rails
  ctx.strokeStyle = "#b9cbd8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 12, -h / 2 - 2 + jitter);
  ctx.lineTo(w / 2 - 12, -h / 2 - 2 + jitter);
  ctx.moveTo(-w / 2 + 12, h / 2 + 2 + jitter);
  ctx.lineTo(w / 2 - 12, h / 2 + 2 + jitter);
  ctx.stroke();
  // hazard tape
  ctx.fillStyle = "#ffb020";
  rr(ctx, -w / 2 + 2, h / 2 - 6 + jitter, w - 4, 5, 2);
  ctx.fill();
  ctx.restore();
}

function drawResident(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; anim: number; hue: number; frame: boolean },
) {
  const step = Math.sin(r.anim * 3) * 3;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (r.frame) {
    ctx.strokeStyle = "#b9c6cf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-11, 6 + step * 0.3);
    ctx.lineTo(-11, -6 + step * 0.3);
    ctx.lineTo(11, -6 + step * 0.3);
    ctx.lineTo(11, 6 + step * 0.3);
    ctx.stroke();
  }
  // body
  ctx.fillStyle = `hsl(${r.hue} 45% 62%)`;
  rr(ctx, -11, -8 + step * 0.2, 22, 20, 8);
  ctx.fill();
  ctx.fillStyle = `hsl(${r.hue} 45% 72%)`;
  rr(ctx, -11, -8 + step * 0.2, 22, 6, 4);
  ctx.fill();
  // head
  ctx.fillStyle = "#f0c9a6";
  ctx.beginPath();
  ctx.arc(0, -13 + step * 0.2, 9, 0, Math.PI * 2);
  ctx.fill();
  // grey hair
  ctx.fillStyle = "#e5e9ec";
  ctx.beginPath();
  ctx.arc(0, -15 + step * 0.2, 9, Math.PI * 0.98, Math.PI * 2.02);
  ctx.fill();
  ctx.restore();
}

/** A patient tucked into a ward bed; sits up and waves while calling. */
function drawPatient(ctx: CanvasRenderingContext2D, p: Patient, room: (typeof ROOMS)[number], t: number) {
  if (!p.inBed) return;
  const bed = room.bed;
  const top = room.side === "top";
  const cx = bed.x + bed.w / 2;
  // head rests on the pillow end of the bed
  const baseY = top ? bed.y + 25 : bed.y + bed.h - 25;
  const dir = top ? 1 : -1;
  const sit = p.sit;
  const breathe = Math.sin(t * 2 + p.anim) * 1.2;
  const hy = baseY + dir * sit * 16 + breathe * (1 - sit * 0.6);

  ctx.save();
  // blanket lump over the body
  ctx.fillStyle = "#8fc3e8";
  const lumpY = top ? bed.y + 52 : bed.y + bed.h - 92;
  rr(ctx, bed.x + 14, lumpY, bed.w - 28, 42, 14);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rr(ctx, bed.x + 18, lumpY + 5, bed.w - 36, 7, 4);
  ctx.fill();

  // torso rises as they sit up
  if (sit > 0.05) {
    ctx.fillStyle = `hsl(${p.hue} 42% 66%)`;
    rr(ctx, cx - 15, hy + dir * 6, 30, 26 * sit + 6, 9);
    ctx.fill();
  }

  // waving arm
  if (sit > 0.3) {
    const swing = Math.sin(p.wave) * 0.6;
    ctx.save();
    ctx.translate(cx + 15, hy + dir * 12);
    ctx.rotate(dir * (0.5 + swing));
    ctx.fillStyle = "#f0c9a6";
    rr(ctx, 0, -4, 22, 8, 4);
    ctx.fill();
    ctx.restore();
  }

  // head
  ctx.fillStyle = "#f0c9a6";
  ctx.beginPath();
  ctx.arc(cx, hy, 11, 0, Math.PI * 2);
  ctx.fill();
  // grey hair
  ctx.fillStyle = "#e8ecef";
  ctx.beginPath();
  ctx.arc(cx, hy - dir * 2, 11, dir > 0 ? Math.PI * 0.98 : 0, dir > 0 ? Math.PI * 2.02 : Math.PI);
  ctx.fill();
  // face — eyes closed when asleep, open when calling
  ctx.fillStyle = "#3c2d24";
  if (sit > 0.45) {
    ctx.beginPath();
    ctx.arc(cx - 4, hy + 1, 1.7, 0, Math.PI * 2);
    ctx.arc(cx + 4, hy + 1, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, hy + 6, 3.4, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - 6, hy + 1, 4, 1.6);
    ctx.fillRect(cx + 2, hy + 1, 4, 1.6);
    if (Math.sin(t * 1.4 + p.anim) > 0.86) {
      ctx.font = `600 11px "Chakra Petch", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(140,190,220,0.85)";
      ctx.fillText("z", cx + 16, hy - 14);
    }
  }
  ctx.restore();
}

/** Comic speech bubble anchored to a bed, kept inside the room. */
function drawSpeech(ctx: CanvasRenderingContext2D, p: Patient, room: (typeof ROOMS)[number]) {
  if (!p.speech) return;
  const s = p.speech;
  const fade = Math.min(1, s.t / 0.35);
  const grow = Math.min(1, (s.max - s.t) / 0.14);
  const bed = room.bed;
  const top = room.side === "top";
  const headX = bed.x + bed.w / 2;
  const headY = top ? bed.y + 25 : bed.y + bed.h - 25;

  ctx.save();
  ctx.font = `700 13px "Chakra Petch", system-ui, sans-serif`;
  const tw = ctx.measureText(s.text).width;
  const bw = tw + 20;
  const bh = 26;
  // sit the bubble beside the head, clamped to the room
  let bx = headX + 26;
  if (bx + bw > room.floor.x + room.floor.w - 8) bx = room.floor.x + room.floor.w - 8 - bw;
  if (bx < room.floor.x + 6) bx = room.floor.x + 6;
  const by = headY - bh / 2 - (top ? -2 : 2);

  ctx.globalAlpha = fade;
  ctx.translate(bx + bw / 2, by + bh / 2);
  ctx.scale(grow, grow);
  ctx.translate(-(bx + bw / 2), -(by + bh / 2));

  // tail
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(bx + 4, by + bh / 2 - 5);
  ctx.lineTo(headX + 9, headY);
  ctx.lineTo(bx + 4, by + bh / 2 + 7);
  ctx.closePath();
  ctx.fill();

  rr(ctx, bx, by, bw, bh, 9);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(40,70,90,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#1d3b52";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s.text, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Spill on the floor, with a cleaning progress ring. */
function drawMess(ctx: CanvasRenderingContext2D, m: Mess, t: number) {
  const wob = Math.sin(t * 2 + m.seed) * 1.5;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.fillStyle = "rgba(190,175,60,0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 27 + wob, 18 + wob * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(214,200,86,0.62)";
  ctx.beginPath();
  ctx.ellipse(-3, 1, 18 + wob * 0.6, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(240,232,150,0.5)";
  ctx.beginPath();
  ctx.ellipse(6, -4, 6, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // wet-floor sign
  ctx.fillStyle = "#ffc832";
  ctx.beginPath();
  ctx.moveTo(20, -8);
  ctx.lineTo(31, -30);
  ctx.lineTo(42, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5a4600";
  ctx.font = `700 13px "Chakra Petch", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 31, -15);
  if (m.clean > 0.02) {
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = "#8ce8ff";
    ctx.beginPath();
    ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(m.clean, 0, 1));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, e: Engine, t: number) {
  const p = e.player;
  const ang = Math.atan2(p.fy, p.fx);
  const moving = Math.hypot(p.vx, p.vy) > 24;
  const step = moving ? Math.sin(p.anim * 9) : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.dash > 0) drawGlow(ctx, 0, 0, 44, "rgba(120,220,255,0.5)", 0.8);
  if (p.stun > 0) {
    ctx.save();
    ctx.rotate(t * 8);
    ctx.fillStyle = "#ffe27a";
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 18, Math.sin(a) * 18 - 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(ang + Math.PI / 2);
  // legs
  ctx.fillStyle = "#25529c";
  rr(ctx, -9, 2 + step * 2, 7, 14, 3);
  ctx.fill();
  rr(ctx, 2, 2 - step * 2, 7, 14, 3);
  ctx.fill();
  // scrubs body
  ctx.fillStyle = THEME.nurse;
  rr(ctx, -13, -12, 26, 24, 9);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  rr(ctx, -5, -12, 10, 22, 4);
  ctx.fill();
  // arms
  ctx.fillStyle = THEME.nurseAlt;
  rr(ctx, -17, -9 - step * 2, 6, 15, 3);
  ctx.fill();
  rr(ctx, 11, -9 + step * 2, 6, 15, 3);
  ctx.fill();
  ctx.restore();

  // head
  const hx = Math.cos(ang) * 3;
  const hy = Math.sin(ang) * 3 - 4 + (moving ? Math.sin(p.anim * 9) * 0.8 : 0);
  ctx.fillStyle = "#f6ceab";
  ctx.beginPath();
  ctx.arc(hx, hy, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b2a22";
  ctx.beginPath();
  ctx.arc(hx - Math.cos(ang) * 2, hy - Math.sin(ang) * 2 - 1, 9, 0, Math.PI * 2);
  ctx.fill();
  // cap
  ctx.fillStyle = "#ffffff";
  rr(ctx, hx - 8, hy - 11, 16, 8, 3);
  ctx.fill();
  ctx.fillStyle = "#ff4060";
  ctx.fillRect(hx - 1.5, hy - 10, 3, 6);
  ctx.fillRect(hx - 4.5, hy - 8.5, 9, 3);

  // carried item
  if (p.carry !== "none") {
    const cx = Math.cos(ang) * 20;
    const cy = Math.sin(ang) * 20;
    if (p.carry === "tray") {
      ctx.fillStyle = "#e9eef2";
      rr(ctx, cx - 12, cy - 8, 24, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#ffb020";
      rr(ctx, cx - 8, cy - 5, 8, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#7fd7ff";
      ctx.beginPath();
      ctx.arc(cx + 5, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.carry === "mop") {
      const swab = Math.sin(t * 12) * 0.25;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang + Math.PI / 2 + swab);
      ctx.strokeStyle = "#c9a978";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = "#dfe9ef";
      rr(ctx, -8, 10, 16, 11, 5);
      ctx.fill();
      ctx.fillStyle = "#b9ccd8";
      ctx.fillRect(-8, 14, 16, 2);
      ctx.restore();
    } else {
      ctx.strokeStyle = "#c79bff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#b061ff";
      ctx.fillRect(cx + 4, cy - 2, 8, 4);
    }
  }
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  bg: HTMLCanvasElement,
  e: Engine,
  t: number,
  shift: Shift,
  view: Rect = { x: 0, y: 0, w: WORLD_W, h: WORLD_H },
) {
  const sh = e.shake;
  const ox = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
  const oy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.drawImage(bg, 0, 0, WORLD_W, WORLD_H);

  // ---- zone highlights
  const tgt = e.target();
  const pulse = 0.55 + Math.sin(t * 6) * 0.45;
  if (e.phase === "allclear" || e.phase === "complete") {
    ctx.strokeStyle = `rgba(123,255,176,${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 4;
    rr(ctx, STATION.x - 6, STATION.y - 6, STATION.w + 12, STATION.h + 12, 14);
    ctx.stroke();
    drawGlow(ctx, STATION.x + STATION.w / 2, STATION.y + STATION.h / 2, 210, "rgba(123,255,176,0.35)", 0.5 * pulse);
  }
  if (e.needsKeys()) {
    ctx.strokeStyle = `rgba(176,97,255,${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    rr(ctx, STATION.x - 4, STATION.y - 4, STATION.w + 8, STATION.h + 8, 14);
    ctx.stroke();
  }
  if (e.needsTray()) {
    ctx.strokeStyle = `rgba(255,176,32,${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    rr(ctx, PANTRY.x - 4, PANTRY.y - 4, PANTRY.w + 8, PANTRY.h + 8, 14);
    ctx.stroke();
  }
  if (e.needsMop()) {
    ctx.strokeStyle = `rgba(140,232,255,${0.32 + pulse * 0.42})`;
    ctx.lineWidth = 3;
    rr(ctx, STATION.x - 4, STATION.y - 4, STATION.w + 8, STATION.h + 8, 14);
    ctx.stroke();
    label(ctx, "MOP →", STATION.x + STATION.w / 2, STATION.y - 16, 13, "#8ce8ff");
  }
  if (e.escort) {
    ctx.strokeStyle = `rgba(255,176,32,${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 4;
    rr(ctx, WC.x - 5, WC.y - 5, WC.w + 10, WC.h + 10, 14);
    ctx.stroke();
    drawGlow(ctx, WC.x + WC.w / 2, WC.y + WC.h / 2, 160, "rgba(255,176,32,0.3)", 0.45 * pulse);
  }

  // ---- active call visuals
  for (const c of e.calls) {
    const room = ROOMS[c.roomId - 1];
    const meta = CALL_META[c.kind];
    const frac = c.remaining / c.limit;
    const fast = c.state === "escort" ? 3 : frac < 0.3 ? 16 : frac < 0.6 ? 9 : 5;
    const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * fast));
    // over-door lamp + light spill
    drawGlow(ctx, room.lamp.x, room.lamp.y, 86, meta.color, 0.36 * blink);
    ctx.fillStyle = meta.color;
    ctx.globalAlpha = 0.35 + blink * 0.65;
    ctx.beginPath();
    ctx.arc(room.lamp.x, room.lamp.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(room.lamp.x - 2, room.lamp.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // room floor tint
    ctx.globalAlpha = 0.12 * blink;
    ctx.fillStyle = meta.color;
    ctx.fillRect(room.floor.x, room.floor.y, room.floor.w, room.floor.h);
    ctx.globalAlpha = 1;

    // call point
    const cp = room.callPoint;
    drawGlow(ctx, cp.x, cp.y, 54, meta.color, 0.5 * blink);
    ctx.fillStyle = meta.color;
    ctx.globalAlpha = 0.5 + blink * 0.5;
    rr(ctx, cp.x - 9, cp.y - 14, 18, 18, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (c.state === "escort") {
      label(ctx, "→ WC", cp.x, cp.y + 26, 12, "#ffd88a");
    } else if (c.progress > 0.02) {
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y - 4, 22, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y - 4, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(c.progress, 0, 1));
      ctx.stroke();
    }
    if (c.task !== "none" && c.state === "waiting") {
      label(ctx, c.task === "meal" ? "MEAL" : "TOILET", cp.x, cp.y + 26, 11, "#ffffff");
    }
  }

  // ---- entities
  for (const m of e.messes) drawMess(ctx, m, t);
  for (const pt of e.patients) drawPatient(ctx, pt, ROOMS[pt.roomId - 1], t);
  for (const r of e.residents) drawResident(ctx, r);
  if (e.escort) {
    const esc = e.escort;
    drawResident(ctx, { x: esc.x, y: esc.y, anim: esc.anim, hue: esc.hue, frame: true });
    drawGlow(ctx, esc.x, esc.y, 40, "rgba(255,176,32,0.5)", 0.5 + 0.3 * Math.sin(t * 6));
    label(ctx, "!", esc.x, esc.y - 32, 18, "#ffd88a");
  }
  for (const b of e.beds) drawBed(ctx, b, t);
  drawPlayer(ctx, e, t);

  // ---- particles
  for (const p of e.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 1) {
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + (1 - a) * 46, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size * (p.kind === 2 ? 1 + (1 - a) * 1.6 : a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // ---- speech bubbles (above entities so they always read)
  for (const pt of e.patients) drawSpeech(ctx, pt, ROOMS[pt.roomId - 1]);

  // ---- floating text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const ft of e.texts) {
    const a = clamp(ft.life / ft.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `700 ${ft.size}px "Chakra Petch", system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(6,14,22,0.85)";
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  // ---- waypoint chevron
  if (tgt) {
    const p = e.player;
    const dx = tgt.x - p.x;
    const dy = tgt.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 90) {
      const a = Math.atan2(dy, dx);
      const rad = 44 + Math.sin(t * 7) * 4;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad);
      ctx.rotate(a);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = tgt.color;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, -9);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();

  // ---- ambience (drawn over the visible view so it works with a follow camera)
  const sm = SHIFT_META[shift];
  if (sm.light > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = sm.tint;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.restore();
  }
  if (sm.light > 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, e.player.x, e.player.y, 220, "rgba(190,225,255,0.30)", 0.9);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = sm.vignette;
  ctx.translate(view.x + view.w / 2, view.y + view.h / 2);
  ctx.fillStyle = vignette(ctx, view.w, view.h);
  ctx.fillRect(-view.w / 2, -view.h / 2, view.w, view.h);
  ctx.restore();

  // ---- danger edge pulse
  if (e.edgePulse > 0.01) {
    const a = e.edgePulse * (0.5 + 0.5 * Math.sin(t * 14));
    ctx.save();
    ctx.globalAlpha = clamp(a * 0.75, 0, 0.75);
    ctx.strokeStyle = e.edgeColor;
    ctx.lineWidth = 22;
    ctx.strokeRect(view.x + 11, view.y + 11, view.w - 22, view.h - 22);
    ctx.restore();
  }
  if (e.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp(e.flash, 0, 0.6);
    ctx.fillStyle = e.flashColor;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.restore();
  }
}
