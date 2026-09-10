import { useState } from "react";

/**
 * Miracle Electronics brand assets.
 *
 * If you drop the real artwork into `public/brand/` it is used verbatim.
 * Supported (first one that loads wins):
 *   public/brand/miracle-electronics.svg
 *   public/brand/miracle-electronics.png
 * Otherwise the hand-built vector below is used as a fallback.
 */
const FILE_CANDIDATES = ["/brand/miracle-electronics.svg", "/brand/miracle-electronics.png"];

const NAVY = "#0A2E4E";
const CYAN = "#00AEEF";
const TEAL = "#1583B0";
const DEEP = "#0E6E9A";

/**
 * The circuit-triangle mark, drawn to match the supplied artwork:
 * a bold cyan triangle, an inner teal triangle, a broken diagonal trace
 * sweeping into the bottom-left corner, a top staple with node terminals,
 * and two horizontal data rails ending in dots.
 */
export function MiracleMark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 320" className={className} role="img" aria-label="Miracle Electronics">
      <g fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        {/* broken outer diagonal trace, sweeping into the bottom-left corner */}
        <path d="M112 100 L88 156" stroke={DEEP} strokeWidth="16" />
        <path d="M80 176 L34 282 Q29 293 41 293 L152 293" stroke={DEEP} strokeWidth="16" />
        {/* top staple with squared terminal */}
        <path d="M133 59 L154 21 Q157 15 164 15 L215 15 L248 55" stroke={DEEP} strokeWidth="15" />
        {/* primary cyan triangle */}
        <path d="M188 52 L98 248 L278 248 Z" stroke={CYAN} strokeWidth="17" />
        {/* inner triangle */}
        <path d="M152 130 L100 234 L204 234 Z" stroke={TEAL} strokeWidth="14" />
        {/* lower cyan data rail */}
        <path d="M48 264 L252 264" stroke={CYAN} strokeWidth="15" />
        {/* dark rail, offset below and to the right */}
        <path d="M186 293 L258 293" stroke={DEEP} strokeWidth="15" />
      </g>
      {/* node terminals */}
      <circle cx="133" cy="59" r="15" fill={DEEP} />
      <circle cx="252" cy="264" r="15" fill={CYAN} />
      <circle cx="186" cy="293" r="12" fill={DEEP} />
      <circle cx="272" cy="293" r="15" fill={DEEP} />
    </svg>
  );
}

/**
 * Full horizontal lockup. Uses the real asset when present.
 * `reversed` swaps the navy wordmark to white for dark backgrounds.
 */
export function MiracleLogo({
  className = "h-10",
  reversed = true,
}: {
  className?: string;
  reversed?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const src = FILE_CANDIDATES[idx];

  if (src) {
    return (
      <img
        src={src}
        alt="Miracle Electronics"
        className={`${className} w-auto object-contain`}
        onError={() => setIdx(idx + 1)}
        draggable={false}
      />
    );
  }

  // fallback lockup: vector mark + typeset wordmark
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <MiracleMark className="h-full w-auto" />
      <div className="leading-none">
        <div
          className="text-[1.05em] font-bold"
          style={{ color: reversed ? "#ffffff" : NAVY, letterSpacing: "0.005em" }}
        >
          MIRACLE
        </div>
        <div
          className="mt-[0.22em] text-[0.34em] font-semibold"
          style={{ color: CYAN, letterSpacing: "0.36em" }}
        >
          ELECTRONICS
        </div>
      </div>
    </div>
  );
}
