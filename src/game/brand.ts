/**
 * Brand artwork for the nurses-station plaque.
 *
 * ── HOW TO GET A 100% ACCURATE LOGO ──────────────────────────────────────
 * Drop the real file into `public/brand/`. Any of these names work, and the
 * first one found wins. Nothing else needs to change:
 *
 *     public/brand/logo.svg     ← best: true vector, sharp at any zoom
 *     public/brand/logo.png     ← fine: use a 2x+ transparent export
 *     public/brand/logo.webp
 *     public/brand/miracle-electronics.svg | .png
 *
 * Until then, PLACEHOLDER_SVG below is used. It is a hand-approximation and
 * is NOT the real logo — it only exists so the plaque isn't blank.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Hand-drawn stand-in. Replaced the moment a real file is present. */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1232" height="321" viewBox="0 0 1232 321">
<g fill="none" stroke-linecap="butt" stroke-linejoin="miter">
<path d="M118 96 L92 152" stroke="#0E6E9A" stroke-width="17"/>
<path d="M84 172 L26 292 Q20 305 34 305 L150 305" stroke="#0E6E9A" stroke-width="17"/>
<path d="M140 57 L163 20 Q167 13 175 13 L228 13 L262 55" stroke="#0E6E9A" stroke-width="16"/>
<path d="M190 48 L100 240 L280 240 Z" stroke="#00AEEF" stroke-width="18"/>
<path d="M158 122 L108 226 L208 226 Z" stroke="#1583B0" stroke-width="15"/>
<path d="M40 268 L246 268" stroke="#00AEEF" stroke-width="16"/>
<path d="M186 305 L268 305" stroke="#0E6E9A" stroke-width="16"/>
</g>
<circle cx="140" cy="57" r="16" fill="#0E6E9A"/>
<circle cx="246" cy="268" r="16" fill="#00AEEF"/>
<circle cx="186" cy="305" r="13" fill="#0E6E9A"/>
<circle cx="282" cy="305" r="16" fill="#0E6E9A"/>
<text x="300" y="212" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="178" fill="#0A2E4E" letter-spacing="2">MIRACLE</text>
<text x="700" y="298" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="48" fill="#00AEEF" letter-spacing="14">ELECTRONICS</text>
</svg>`;

const PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/** Fallback aspect ratio; overwritten by the real file's true dimensions. */
export const BRAND_ASPECT = 1232 / 321;

const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/";

const SOURCES = [
  `${BASE}brand/logo.svg`,
  `${BASE}brand/logo.png`,
  `${BASE}brand/logo.webp`,
  `${BASE}brand/miracle-electronics.svg`,
  `${BASE}brand/miracle-electronics.png`,
  PLACEHOLDER,
];

let img: HTMLImageElement | null = null;
let ready = false;
let aspect = BRAND_ASPECT;
/** True once a real supplied file loaded (i.e. not the placeholder). */
let authentic = false;

export function brandImage(): HTMLImageElement | null {
  return ready ? img : null;
}

/** Measured aspect ratio of whatever artwork actually loaded. */
export function brandAspect(): number {
  return aspect;
}

export function brandIsAuthentic(): boolean {
  return authentic;
}

/** Load brand artwork, trying each candidate in turn. `onReady` fires once. */
export function loadBrand(onReady: () => void) {
  if (img) {
    if (ready) onReady();
    return;
  }
  let i = 0;
  const el = new Image();
  img = el;
  el.decoding = "async";
  el.onload = () => {
    ready = true;
    authentic = el.src !== PLACEHOLDER && !el.src.startsWith("data:");
    // trust the file's real dimensions so any logo shape fits correctly
    if (el.naturalWidth > 0 && el.naturalHeight > 0) aspect = el.naturalWidth / el.naturalHeight;
    onReady();
  };
  el.onerror = () => {
    i += 1;
    if (i < SOURCES.length) el.src = SOURCES[i];
  };
  el.src = SOURCES[0];
}
