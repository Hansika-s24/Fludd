"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts to its value instead of jumping, from whatever it last showed.
 * With reduced motion it simply shows the value.
 */
export function CountUp({ value, decimals = 0, ms = 700, className = "" }: { value: number; decimals?: number; ms?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      t0 ??= now;
      const t = still ? 1 : Math.min(1, (now - t0) / ms);
      const next = start + (value - start) * (1 - (1 - t) ** 3);
      from.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return <span className={`tabular-nums ${className}`}>{shown.toFixed(decimals)}</span>;
}
