/**
 * Shown when a phone/tablet is held in portrait.
 *
 * The ward is a wide 1280x840 plane — in portrait the play area collapses to a
 * letterbox that is too small to play, so we block the game until the device is
 * turned. Auto-dismisses the moment the viewport goes landscape.
 */
export default function LandscapeGate({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Rotate your device"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-[#03070d]/96 px-6 text-center backdrop-blur-md"
      style={{ touchAction: "none" }}
    >
      <div className="pointer-events-none absolute inset-0 cc-grid-bg opacity-30" />
      <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex items-center justify-center">
        <div className="cc-rotate-phone relative h-28 w-16 rounded-[10px] border-[3px] border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.35)]">
          <div className="absolute left-1/2 top-2 h-1 w-5 -translate-x-1/2 rounded-full bg-cyan-300/60" />
          <div className="absolute left-1/2 top-1/2 h-7 w-9 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-cyan-300/25" />
          <div className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-300/60" />
        </div>
      </div>

      <div className="relative flex flex-col gap-2">
        <div className="text-[11px] tracking-[0.4em] text-cyan-400">WARD RUSH</div>
        <div className="text-3xl font-bold leading-tight tracking-wider text-white cc-shadow-text sm:text-4xl">
          ROTATE YOUR DEVICE
        </div>
        <div className="text-xs leading-relaxed tracking-[0.16em] text-slate-400 sm:text-sm">
          THE WARD RUNS IN <span className="text-[#00AEEF]">LANDSCAPE</span>
        </div>
        <div className="mt-1 text-[10px] leading-relaxed tracking-widest text-slate-600">
          TURN OFF PORTRAIT LOCK IF IT DOESN'T SPIN
        </div>
      </div>
    </div>
  );
}
