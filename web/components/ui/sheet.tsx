"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/** Peek shows the search field and the shortcuts, above the home indicator. */
const PEEK_PX = 196;
/** Fired on window to move the phone sheet to half height. */
export const SHEET_HALF_EVENT = "fludd:sheet-half";
/** Fired on window to raise the phone sheet to full height (search focused, like Maps). */
export const SHEET_FULL_EVENT = "fludd:sheet-full";

const narrowQuery = "(max-width: 767px)";
const subscribeNarrow = (cb: () => void) => {
  const m = window.matchMedia(narrowQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
}

/** Apple's momentum projection: where a flick at this velocity would come to rest. */
const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);
/** Soft resistance past an edge. */
const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

/**
 * The one structural surface. Phone: a bottom sheet that tracks the finger 1:1, projects the flick and snaps to
 * peek, half or full with a spring (damping 0.8, response 0.3). Desktop: a fixed sidebar.
 */
export function Sheet({
  children, header, className = "", scrollKey,
}: { children: ReactNode; header: ReactNode; className?: string; scrollKey?: string }) {
  const narrow = useNarrow();
  const body = useRef<HTMLDivElement>(null);
  // A new tab starts at its top, like a native tab bar.
  useEffect(() => {
    body.current?.scrollTo(0, 0);
  }, [scrollKey]);
  const [vh, setVh] = useState(800);
  const [inset, setInset] = useState(0);
  const [insetTop, setInsetTop] = useState(0);
  const y = useMotionValue(0);
  const drag = useRef<{ startY: number; startOffset: number; samples: { y: number; t: number }[] } | null>(null);

  useEffect(() => {
    const set = () => {
      setVh(window.innerHeight);
      // env() is CSS-only: read the home-indicator inset off a probe.
      const probe = document.createElement("div");
      probe.style.paddingBottom = "env(safe-area-inset-bottom)";
      probe.style.paddingTop = "env(safe-area-inset-top)";
      document.body.appendChild(probe);
      setInset(parseFloat(getComputedStyle(probe).paddingBottom) || 0);
      setInsetTop(parseFloat(getComputedStyle(probe).paddingTop) || 0);
      probe.remove();
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Full stops below the map buttons (wordmark, Drainage), so the sheet never runs under them.
  const height = vh - insetTop - 110;
  // Offsets from the top of the sheet's travel: full = 0, half, peek.
  const peek = PEEK_PX + inset;
  const snaps = [0, height - Math.round(vh * 0.5), height - peek];
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Start at peek; re-snap when the viewport changes.
  useEffect(() => {
    y.set(height - peek);
  }, [height, peek, y]);

  // A section opening, or a Pelican route drawn on the map, asks for the sheet at half.
  const half = snaps[1];
  useEffect(() => {
    const toHalf = () => {
      if (reduce) y.set(half);
      else animate(y, half, { type: "spring", bounce: 0.2, duration: 0.3 });
    };
    const toFull = () => {
      if (reduce) y.set(0);
      else animate(y, 0, { type: "spring", bounce: 0.2, duration: 0.3 });
    };
    window.addEventListener(SHEET_HALF_EVENT, toHalf);
    window.addEventListener(SHEET_FULL_EVENT, toFull);
    return () => {
      window.removeEventListener(SHEET_HALF_EVENT, toHalf);
      window.removeEventListener(SHEET_FULL_EVENT, toFull);
    };
  }, [half, reduce, y]);

  function settle(velocity: number) {
    const target = y.get() + project(velocity);
    const to = snaps.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    if (reduce) y.set(to);
    else animate(y, to, { type: "spring", bounce: 0.2, duration: 0.3, velocity });
  }

  if (!narrow) {
    return (
      <aside
        className={`material-thick fixed left-4 top-4 z-10 flex max-h-[calc(100dvh-2rem)] w-[380px] flex-col overflow-hidden rounded-[var(--radius-surface)] ${className}`}
      >
        {header}
        <div ref={body} className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none]">{children}</div>
      </aside>
    );
  }

  return (
    <motion.aside
      style={{ y, height, bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
      className={`material-thick fixed inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-[var(--radius-surface)] ${className}`}
    >
      <div
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          y.stop();
          drag.current = { startY: e.clientY, startOffset: y.get(), samples: [{ y: e.clientY, t: e.timeStamp }] };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          let next = d.startOffset + (e.clientY - d.startY);
          const max = snaps[2];
          if (next < 0) next = -rubberband(-next, vh);
          if (next > max) next = max + rubberband(next - max, vh);
          y.set(next);
          d.samples.push({ y: e.clientY, t: e.timeStamp });
          if (d.samples.length > 5) d.samples.shift();
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const a = d.samples[0], b = d.samples[d.samples.length - 1];
          // A tap (on the search field, say) is not a drag: leave the sheet where it is or where it is going.
          if (Math.abs(b.y - d.startY) < 6) {
            if (!y.isAnimating()) settle(0);
            return;
          }
          const dt = Math.max(1, b.t - a.t);
          settle(((b.y - a.y) / dt) * 1000);
        }}
        onPointerCancel={() => {
          drag.current = null;
          settle(0);
        }}
      >
        <button
          type="button"
          aria-label="Resize panel"
          onClick={() => settle(y.get() > snaps[1] ? -1500 : 1500)}
          className="mx-auto mt-1.5 block h-6 w-16"
        >
          <span className="mx-auto block h-[5px] w-9 rounded-full bg-label-3/50" />
        </button>
        {header}
      </div>
      <div ref={body} className="flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-width:none]">{children}</div>
    </motion.aside>
  );
}
