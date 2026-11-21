"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import type { DepthBand, Grade, LngLat } from "@/lib/types";

export interface Place {
  label: string;
  position: LngLat;
}

export const BAND_WORDS: Record<DepthBand, string> = {
  none: "Dry",
  under_6in: "Under 6 in",
  "6_12in": "6 to 12 in",
  "1_2ft": "1 to 2 ft",
  over_2ft: "Over 2 ft",
};

/** Same band edges as the grade (lib/grade depthBand), for live depths read off the map. */
export function bandOf(m: number): DepthBand {
  if (m <= 0.02) return "none";
  if (m < 0.15) return "under_6in";
  if (m < 0.3) return "6_12in";
  if (m < 0.61) return "1_2ft";
  return "over_2ft";
}

/** "about 9 pm" from hour zero plus whole hours, Tampa time. */
export function aboutTime(hourZero: string, hour: number): string {
  const t = new Date(Date.parse(hourZero) + hour * 3_600_000);
  return `about ${t.toLocaleString("en-US", { hour: "numeric", timeZone: "America/New_York" }).replace(" AM", " am").replace(" PM", " pm")}`;
}

/** Stagger position for the motion kit, capped so a long list does not crawl in. */
export function stagger(i: number): CSSProperties {
  return { "--i": Math.min(i, 6) } as CSSProperties;
}

/** Still waiting on an answer: three thinking dots. The "…" stays for screen readers. */
export const Thinking = (
  <>
    <span className="typing" aria-hidden><i /><i /><i /></span>
    <span className="sr-only">…</span>
  </>
);

const prefersStill = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A number that has just arrived counts in from zero. CountUp only counts when its value changes,
 * so this hands it zero for the first frame. With reduced motion it shows the value straight away.
 */
export function CountIn({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const [live, setLive] = useState(prefersStill);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return <CountUp value={live ? value : 0} decimals={decimals} className={className} />;
}

const SKELETON_WIDTHS = ["w-40", "w-28", "w-36"];

/**
 * Waiting on data: placeholder rows shaped like the rows that will arrive, so the group barely moves
 * when they do. The first row keeps the waiting message as its label.
 */
export function LoadingRows({ text, rows = 1 }: { text: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={`flex gap-3 px-4 py-3 ${r === rows - 1 ? "" : "border-b border-separator"}`}>
          <span className="shimmer mt-0.5 size-7 shrink-0 rounded-[8px]" aria-hidden />
          <div className="min-w-0 flex-1">
            {r === 0 ? (
              <p className="text-subhead text-label-2">{text}</p>
            ) : (
              <span className="shimmer my-1 block h-3 w-24 rounded-full" aria-hidden />
            )}
            <span className={`shimmer mt-1.5 block h-4 rounded-full ${SKELETON_WIDTHS[r % SKELETON_WIDTHS.length]}`} aria-hidden />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * One list row: small coloured icon, label, value. The value carries meaning in words, never colour alone.
 * The row rises in (`i` staggers it among its siblings) and a value that changes in place swaps in.
 */
export function ListRow({
  icon, tone = "tint", label, value, detail, last, i = 0,
}: {
  icon: ReactNode;
  tone?: "tint" | "safe" | "warn" | "late";
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  last?: boolean;
  i?: number;
}) {
  const bg = { tint: "bg-tint", safe: "bg-safe", warn: "bg-warn", late: "bg-late" }[tone];
  const fg = { tint: "text-label", safe: "text-label", warn: "text-label", late: "text-late" }[tone];
  // A new key remounts the value line, which replays its swap-in whenever the words change.
  const valueKey = typeof value === "string" || typeof value === "number" ? value : "node";
  return (
    <div className={`rise-in flex gap-3 px-4 py-3 ${last ? "" : "border-b border-separator"}`} style={stagger(i)}>
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] text-white ${bg}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-subhead text-label-2">{label}</p>
        </div>
        <p key={valueKey} className={`swap-in text-headline font-semibold ${fg}`}>{value}</p>
        {detail && <p className="mt-0.5 text-footnote text-label-2">{detail}</p>}
      </div>
    </div>
  );
}

/** Small stroke icons, 16 px, currentColor. */
export const Icon = {
  car: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14v-5l-2-5H7l-2 5v5Z" /><circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" />
    </svg>
  ),
  truck: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" />
    </svg>
  ),
  door: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V4h10v17M3 21h18M13 12h.01" />
    </svg>
  ),
  road: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 9-7 9 7M5 10v10h14V10" />
    </svg>
  ),
  wrench: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
    </svg>
  ),
};

/** Remedies text from the Gemini route; null while loading, [] when unavailable. Never invents numbers. */
export function useRemedies(grade: Grade, depthAtBuilding100yrM: number | null): string[] | null {
  const [sentences, setSentences] = useState<string[] | null>(null);
  useEffect(() => {
    if (depthAtBuilding100yrM === null) return;
    let stale = false;
    // ponytail: pump and Milton flags read from the grade's own reasons; a typed flag on Grade would be cleaner.
    const body = {
      letter: grade.letter,
      depthByStorm: grade.depthByStorm,
      femaZone: grade.officialMapSays.slice(0, 120),
      miltonPointNearby: grade.reasons.some((r) => r.kind === "cap" && /milton/i.test(r.text)),
      pumpDependent: grade.reasons.some((r) => /pump/i.test(r.text)),
      depthAtBuilding100yrM: Math.min(20, Math.max(0, depthAtBuilding100yrM)),
    };
    fetch("/api/gemini/remedies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => (r.ok ? (r.json() as Promise<{ sentences?: string[] }>) : { sentences: [] }))
      .then((j) => !stale && setSentences(j.sentences ?? []))
      .catch(() => !stale && setSentences([]));
    return () => {
      stale = true;
    };
  }, [grade, depthAtBuilding100yrM]);
  return sentences;
}
