import { WORLD_W, WORLD_H } from "./constants";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Vec {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  label: string;
  side: "top" | "bottom";
  floor: Rect;
  door: Rect;
  callPoint: Vec;
  lamp: Vec;
  bed: Rect;
  locker: Rect;
  plate: Vec;
}

const B = 14; // outer border thickness
const ROOM_W = 242;
const ROOM_GAP = 10;
const DOOR_W = 92;

const TOP_Y = B;
const TOP_H = 222;
const TOP_WALL_Y = TOP_Y + TOP_H; // 236
const WALL_T = 10;

const CORR_A = { y: TOP_WALL_Y + WALL_T, h: 140 }; // 246 -> 386
const ISLAND_Y = CORR_A.y + CORR_A.h; // 386
const ISLAND_H = 116; // 386 -> 502
const CORR_B = { y: ISLAND_Y + ISLAND_H, h: 140 }; // 502 -> 642
const BOT_WALL_Y = CORR_B.y + CORR_B.h; // 642
const BOT_Y = BOT_WALL_Y + WALL_T; // 652
const BOT_H = WORLD_H - B - BOT_Y; // 174

export const PANTRY: Rect = { x: 90, y: ISLAND_Y, w: 240, h: ISLAND_H };
export const STATION: Rect = { x: 470, y: ISLAND_Y, w: 340, h: ISLAND_H };
export const WC: Rect = { x: 950, y: ISLAND_Y, w: 240, h: ISLAND_H };

export const CORRIDOR_A: Rect = { x: B, y: CORR_A.y, w: WORLD_W - B * 2, h: CORR_A.h };
export const CORRIDOR_B: Rect = { x: B, y: CORR_B.y, w: WORLD_W - B * 2, h: CORR_B.h };
export const PASSAGES: Rect[] = [
  { x: B, y: ISLAND_Y, w: PANTRY.x - B, h: ISLAND_H },
  { x: PANTRY.x + PANTRY.w, y: ISLAND_Y, w: STATION.x - (PANTRY.x + PANTRY.w), h: ISLAND_H },
  { x: STATION.x + STATION.w, y: ISLAND_Y, w: WC.x - (STATION.x + STATION.w), h: ISLAND_H },
  { x: WC.x + WC.w, y: ISLAND_Y, w: WORLD_W - B - (WC.x + WC.w), h: ISLAND_H },
];

export const STATION_ENTRY: Vec = { x: STATION.x + STATION.w / 2, y: STATION.y + STATION.h + 26 };

function buildRooms(): Room[] {
  const rooms: Room[] = [];
  for (let i = 0; i < 10; i++) {
    const top = i < 5;
    const col = i % 5;
    const x = B + col * (ROOM_W + ROOM_GAP);
    const y = top ? TOP_Y : BOT_Y;
    const h = top ? TOP_H : BOT_H;
    const doorX = x + (ROOM_W - DOOR_W) / 2;
    const id = i + 1;
    const bedW = 96;
    const bedH = 132;
    const bed: Rect = top
      ? { x: x + 26, y: y + 22, w: bedW, h: bedH }
      : { x: x + 26, y: y + h - bedH - 20, w: bedW, h: bedH };
    rooms.push({
      id,
      label: id < 10 ? `0${id}` : `${id}`,
      side: top ? "top" : "bottom",
      floor: { x, y, w: ROOM_W, h },
      door: { x: doorX, y: top ? TOP_WALL_Y : BOT_WALL_Y, w: DOOR_W, h: WALL_T },
      callPoint: top ? { x: x + ROOM_W - 54, y: y + 62 } : { x: x + ROOM_W - 54, y: y + h - 60 },
      lamp: { x: doorX + DOOR_W / 2, y: top ? TOP_WALL_Y + 26 : BOT_WALL_Y - 26 },
      bed,
      locker: top
        ? { x: x + ROOM_W - 66, y: y + 134, w: 40, h: 44 }
        : { x: x + ROOM_W - 66, y: y + 26, w: 40, h: 44 },
      plate: { x: doorX - 26, y: top ? TOP_WALL_Y + 24 : BOT_WALL_Y - 24 },
    });
  }
  return rooms;
}

export const ROOMS = buildRooms();

function buildSolids(): Rect[] {
  const s: Rect[] = [];
  // outer walls
  s.push({ x: 0, y: 0, w: WORLD_W, h: B });
  s.push({ x: 0, y: WORLD_H - B, w: WORLD_W, h: B });
  s.push({ x: 0, y: 0, w: B, h: WORLD_H });
  s.push({ x: WORLD_W - B, y: 0, w: B, h: WORLD_H });

  for (let i = 0; i < 10; i++) {
    const top = i < 5;
    const col = i % 5;
    const x = B + col * (ROOM_W + ROOM_GAP);
    const wallY = top ? TOP_WALL_Y : BOT_WALL_Y;
    const doorX = x + (ROOM_W - DOOR_W) / 2;
    // front wall left + right of doorway
    s.push({ x, y: wallY, w: doorX - x, h: WALL_T });
    s.push({ x: doorX + DOOR_W, y: wallY, w: x + ROOM_W - (doorX + DOOR_W), h: WALL_T });
    // divider between rooms
    if (col > 0) {
      s.push({ x: x - ROOM_GAP, y: top ? TOP_Y : BOT_Y, w: ROOM_GAP, h: top ? TOP_H : BOT_H });
    }
    // in-room furniture is walkable-around: bed is solid
    const r = ROOMS[i];
    s.push({ x: r.bed.x, y: r.bed.y, w: r.bed.w, h: r.bed.h });
    s.push(r.locker);
  }

  s.push(PANTRY, STATION, WC);
  return s;
}

export const SOLIDS = buildSolids();

/** Rects that wandering NPCs / beds are allowed to roam in. */
export const ROAM_AREAS: Rect[] = [
  { x: B + 30, y: CORRIDOR_A.y + 24, w: CORRIDOR_A.w - 60, h: CORRIDOR_A.h - 48 },
  { x: B + 30, y: CORRIDOR_B.y + 24, w: CORRIDOR_B.w - 60, h: CORRIDOR_B.h - 48 },
  { x: PASSAGES[1].x + 20, y: ISLAND_Y, w: PASSAGES[1].w - 40, h: ISLAND_H },
  { x: PASSAGES[2].x + 20, y: ISLAND_Y, w: PASSAGES[2].w - 40, h: ISLAND_H },
];

export const BED_LANES = {
  horizontal: [CORRIDOR_A.y + CORRIDOR_A.h / 2, CORRIDOR_B.y + CORRIDOR_B.h / 2],
  vertical: [PASSAGES[1].x + PASSAGES[1].w / 2, PASSAGES[2].x + PASSAGES[2].w / 2],
};

export const LAYOUT = {
  B,
  ROOM_W,
  WALL_T,
  TOP_Y,
  TOP_H,
  TOP_WALL_Y,
  BOT_Y,
  BOT_H,
  BOT_WALL_Y,
  ISLAND_Y,
  ISLAND_H,
  CORR_A,
  CORR_B,
  DOOR_W,
};

export function rectNear(px: number, py: number, r: Rect, pad: number): boolean {
  const cx = Math.max(r.x, Math.min(px, r.x + r.w));
  const cy = Math.max(r.y, Math.min(py, r.y + r.h));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= pad * pad;
}

export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Push a circle out of every solid it overlaps. Mutates p. */
export function resolveSolids(p: { x: number; y: number }, radius: number, solids: Rect[] = SOLIDS): boolean {
  let hit = false;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (p.x + radius < s.x || p.x - radius > s.x + s.w || p.y + radius < s.y || p.y - radius > s.y + s.h) continue;
    const cx = Math.max(s.x, Math.min(p.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(p.y, s.y + s.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 > radius * radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      p.x += (dx / d) * (radius - d);
      p.y += (dy / d) * (radius - d);
    } else {
      const left = p.x - s.x;
      const right = s.x + s.w - p.x;
      const up = p.y - s.y;
      const down = s.y + s.h - p.y;
      const m = Math.min(left, right, up, down);
      if (m === left) p.x = s.x - radius;
      else if (m === right) p.x = s.x + s.w + radius;
      else if (m === up) p.y = s.y - radius;
      else p.y = s.y + s.h + radius;
    }
  }
  return hit;
}
