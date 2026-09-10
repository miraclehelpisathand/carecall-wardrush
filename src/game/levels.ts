import { CALL_META, clamp, type CallKind, type Shift, type TaskKind } from "./constants";

export interface SpawnDef {
  t: number;
  kind: CallKind;
  task: TaskKind;
}

export interface LevelConfig {
  level: number;
  shift: Shift;
  title: string;
  spawns: SpawnDef[];
  baseTime: number;
  maxConcurrent: number;
  bedCount: number;
  bedVertical: number;
  bedSpeed: number;
  residents: number;
  residentSpeed: number;
  wardName: string;
}

const WARDS = [
  "ORIENTATION WING",
  "MEDICAL WARD A",
  "SURGICAL WARD B",
  "AGED CARE — WEST",
  "HIGH DEPENDENCY",
  "DEMENTIA SECURE",
  "REHAB WING",
  "PALLIATIVE SUITE",
  "ACUTE ASSESSMENT",
  "CRITICAL WING",
];

export function shiftFor(level: number): Shift {
  if (level <= 16) return "day";
  if (level <= 34) return "evening";
  return "night";
}

function kindPool(level: number): CallKind[] {
  const pool: CallKind[] = ["patient", "patient", "patient"];
  if (level >= 3) pool.push("emergency");
  if (level >= 4) pool.push("assist", "assist");
  if (level >= 7) pool.push("emergency");
  if (level >= 9) pool.push("keys");
  if (level >= 14) pool.push("keys", "emergency");
  if (level >= 20) pool.push("assist", "emergency");
  if (level >= 28) pool.push("keys", "emergency", "emergency");
  if (level >= 38) pool.push("emergency", "keys", "assist");
  return pool;
}

export function buildLevel(level: number): LevelConfig {
  const L = clamp(level, 1, 50);
  const count = Math.round(clamp(3 + L * 0.62, 3, 30));
  const interval = clamp(6.4 - L * 0.095, 1.55, 6.4);
  const baseTime = clamp(26 - L * 0.32, 10.5, 26);
  const maxConcurrent = Math.round(clamp(2 + L / 5.5, 2, 8));
  const pool = kindPool(L);

  const mealFrom = 11;
  const toiletFrom = 15;
  const taskChance = L >= toiletFrom ? clamp(0.14 + (L - toiletFrom) * 0.011, 0, 0.34) : L >= mealFrom ? 0.16 : 0;

  const spawns: SpawnDef[] = [];
  let t = 0.5;
  for (let i = 0; i < count; i++) {
    const kind = i === 0 && L < 4 ? "patient" : pool[Math.floor(Math.random() * pool.length)];
    // NOTE: keys/emergency calls never carry a fetch task — you can only carry one item.
    let task: TaskKind = "none";
    if (Math.random() < taskChance) {
      if (kind === "patient" && L >= mealFrom) task = L >= toiletFrom && Math.random() < 0.35 ? "toilet" : "meal";
      else if (kind === "assist" && L >= toiletFrom) task = "toilet";
    }
    spawns.push({ t, kind, task });
    const jitter = interval * 0.35;
    t += Math.max(0.9, interval + (Math.random() * 2 - 1) * jitter);
  }

  const bedCount = L >= 5 ? Math.round(clamp(1 + (L - 5) / 7, 1, 6)) : 0;
  const bedVertical = L >= 13 ? Math.round(clamp((L - 13) / 12 + 1, 1, 2)) : 0;
  const residents = L >= 2 ? Math.round(clamp(1 + (L - 2) / 4.2, 1, 9)) : 0;

  return {
    level: L,
    shift: shiftFor(L),
    title: `SHIFT ${L}`,
    wardName: WARDS[Math.min(WARDS.length - 1, Math.floor((L - 1) / 5))],
    spawns,
    baseTime,
    maxConcurrent,
    bedCount,
    bedVertical,
    bedSpeed: clamp(95 + L * 4.4, 95, 300),
    residents,
    residentSpeed: clamp(38 + L * 1.5, 38, 96),
  };
}

export function callLimit(cfg: LevelConfig, kind: CallKind, task: TaskKind): number {
  let t = cfg.baseTime * CALL_META[kind].timeMul;
  if (task === "meal") t += 7.5;
  if (task === "toilet") t += 4.5;
  return t;
}
