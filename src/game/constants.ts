export const WORLD_W = 1280;
export const WORLD_H = 840;

export type CallKind = "emergency" | "patient" | "assist" | "keys";
export type TaskKind = "none" | "meal" | "toilet";
export type CarryKind = "none" | "tray" | "keys" | "mop";
export type Shift = "day" | "evening" | "night";

export interface CallMeta {
  label: string;
  short: string;
  color: string;
  glow: string;
  points: number;
  reset: number; // seconds to hold at the call point
  timeMul: number; // multiplier on the level base time limit
  priority: number; // lower = more urgent
}

export const CALL_META: Record<CallKind, CallMeta> = {
  emergency: {
    label: "EMERGENCY",
    short: "EMG",
    color: "#ff2f4f",
    glow: "#ff86a0",
    points: 280,
    reset: 0.8,
    timeMul: 0.7,
    priority: 0,
  },
  keys: {
    label: "KEYS",
    short: "KEY",
    color: "#b061ff",
    glow: "#d9adff",
    points: 220,
    reset: 0.5,
    timeMul: 0.9,
    priority: 1,
  },
  assist: {
    label: "NURSE ASSIST",
    short: "AST",
    color: "#ffb020",
    glow: "#ffd88a",
    points: 170,
    reset: 0.6,
    timeMul: 0.95,
    priority: 2,
  },
  patient: {
    label: "PATIENT CALL",
    short: "PAT",
    color: "#25e07a",
    glow: "#9dffcb",
    points: 120,
    reset: 0.45,
    timeMul: 1,
    priority: 3,
  },
};

export const TASK_META: Record<TaskKind, { label: string; tag: string }> = {
  none: { label: "", tag: "" },
  meal: { label: "MEAL / DRINK", tag: "TRAY" },
  toilet: { label: "TOILET ASSIST", tag: "→WC" },
};

export const PLAYER = {
  radius: 15,
  speed: 268,
  accel: 2400,
  friction: 1900,
  dashSpeed: 690,
  dashTime: 0.15,
  dashCooldown: 1.05,
  carryMul: 0.8,
  escortMul: 0.72,
  stunTime: 0.5,
};

export const THEME = {
  corridor: "#dfe7ec",
  corridorAlt: "#d5dee5",
  roomFloor: "#eef4f6",
  roomFloorAlt: "#e5edf1",
  wall: "#a8b8c4",
  wallTop: "#cbd8e1",
  wallEdge: "#7f909d",
  trim: "#5f7c8c",
  station: "#1d3b52",
  stationTop: "#2b5675",
  pantry: "#3d5566",
  wc: "#33566b",
  ink: "#33454f",
  nurse: "#2f6df6",
  nurseAlt: "#1c4fc4",
};

export const SHIFT_META: Record<Shift, { label: string; tint: string; vignette: number; light: number }> = {
  day: { label: "DAY SHIFT", tint: "rgba(255,244,222,0.0)", vignette: 0.22, light: 0 },
  evening: { label: "EVENING SHIFT", tint: "rgba(255,150,70,0.16)", vignette: 0.42, light: 0.15 },
  night: { label: "NIGHT SHIFT", tint: "rgba(40,70,150,0.42)", vignette: 0.66, light: 0.55 },
};

export const MESS = {
  cleanTime: 1.15,
  radius: 26,
  slipSpeed: 150,
  points: 150,
  endPenalty: 90,
};

/** Things the patients call out. Keeps the ward feeling human. */
export const SAY: Record<string, string[]> = {
  emergency: ["HELP ME!", "I'VE FALLEN!", "MY CHEST!", "NURSE — QUICK!", "I CAN'T BREATHE!"],
  patient: ["NURSE?", "HELLO? ANYONE?", "EXCUSE ME LOVE", "COULD YOU COME?", "I RANG MY BELL"],
  assist: ["NEED A HAND!", "ASSIST PLEASE!", "OVER HERE!", "TWO OF US NEEDED"],
  keys: ["CABINET'S LOCKED", "NEED THE KEYS", "MEDS ARE LOCKED", "KEY PLEASE!"],
  meal: ["I'M STARVING", "CUP OF TEA?", "SO THIRSTY...", "MISSED MY LUNCH"],
  toilet: ["I NEED THE LOO!", "TOILET — PLEASE!", "I CAN'T WAIT!", "QUICKLY DEAR!"],
  thanks: ["THANK YOU!", "BLESS YOU", "TA, LOVE", "MUCH BETTER", "YOU'RE AN ANGEL"],
  missed: ["TOO LATE...", "OH DEAR...", "NEVER MIND", "I GAVE UP"],
  accident: ["OH NO...", "I'M SO SORRY!", "TOO LATE!", "OH DEAR ME"],
  escort: ["NEARLY THERE?", "HURRY DEAR!", "OOH...", "NOT LONG NOW"],
};

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
