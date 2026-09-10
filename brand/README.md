# Brand artwork

Drop the **real logo file** in this folder and the game uses it verbatim on the
nurses-station plaque. No code changes needed — just add the file and rebuild.

The first filename found wins:

| Priority | Filename | Notes |
| --- | --- | --- |
| 1 | `logo.svg` | **Best.** True vector — pixel-perfect at any zoom, tiny file. |
| 2 | `logo.png` | Good. Export at **2000px+ wide**, transparent background. |
| 3 | `logo.webp` | Good. Same guidance as PNG. |
| 4 | `miracle-electronics.svg` / `.png` | Alternate names, also accepted. |

If none are present, a hand-drawn **placeholder** in `src/game/brand.ts` is used.
It is an approximation, not the real logo.

## Which format?

**Use SVG if you have it.** Ask whoever holds the brand assets for the original
vector — the source is normally Illustrator (`.ai`), EPS or PDF, and any of
those export straight to SVG with `File → Save As` / `Export As`. Vector stays
sharp when the player zooms, and the whole file is usually only a few KB.

Only fall back to PNG if no vector exists anywhere. If so, export it as large as
you can: the plaque renders at roughly 240×66 CSS px, but on a high-DPI phone at
full zoom that can be sampled at 3–4x, so a small PNG will look soft.

## Aspect ratio

Anything works. The artwork is measured on load and **contain-fitted** into the
plaque, so a square or stacked lockup is scaled correctly rather than stretched.

## Background

The plaque is drawn **white**, so the standard full-colour logo (navy wordmark,
cyan mark) sits on it correctly. Do **not** supply a reversed/white-text
version — it would disappear.
