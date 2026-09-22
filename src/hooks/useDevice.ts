import { useEffect, useState } from "react";

export interface Device {
  /** Phone or small tablet — use overlay HUD + follow camera. */
  handheld: boolean;
  /** Wide desktop / laptop layout with the side rail. */
  desktop: boolean;
  /** Prefer on-screen stick + dash. */
  touch: boolean;
  /** Shorter edge of the viewport, in CSS pixels. */
  width: number;
  height: number;
  shortSide: number;
  portrait: boolean;
}

function readDevice(): Device {
  if (typeof window === "undefined") {
    return { handheld: false, desktop: true, touch: false, width: 1280, height: 800, shortSide: 800, portrait: false };
  }

  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  const short = Math.min(width, height);
  const long = Math.max(width, height);

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const touches = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const uaMobile = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const uaTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (touches > 1 && /Macintosh/.test(ua) && coarse);

  const touch = coarse || noHover || uaMobile || uaTablet || (touches > 0 && !fine);
  // phones and small tablets, or any coarse-pointer device that can't fit the ward + rail
  const handheld = uaMobile || short < 760 || (touch && (width < 1100 || height < 700));
  const desktop = !handheld && width >= 1024;

  return {
    handheld,
    desktop,
    touch: touch || handheld,
    width,
    height,
    shortSide: short,
    portrait: height >= width && long / Math.max(1, short) > 1.05,
  };
}

/**
 * Live device / viewport profile. Updates on rotate, resize, and iOS
 * address-bar show/hide (visualViewport). Used so a GitHub Pages visit
 * on a phone automatically gets the mobile layout.
 */
export function useDevice(): Device {
  const [device, setDevice] = useState<Device>(readDevice);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setDevice(readDevice()));
    };

    const mqs = [
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(pointer: fine)"),
      window.matchMedia("(hover: none)"),
      window.matchMedia("(min-width: 1024px)"),
    ];
    for (const mq of mqs) mq.addEventListener("change", update);

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    update();
    return () => {
      cancelAnimationFrame(raf);
      for (const mq of mqs) mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, []);

  return device;
}
