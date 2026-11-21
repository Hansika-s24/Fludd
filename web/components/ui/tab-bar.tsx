"use client";

import type { ReactNode } from "react";

export type Tab = "home" | "live" | "ask" | "rewards" | "you";

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

export const ICONS: Record<Tab, ReactNode> = {
  home: svg(<path d="m3 11 9-7 9 7M5 10v10h14V10" />),
  live: svg(<><path d="M2 14c2 0 2-1.5 4-1.5S8 14 10 14s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M12 3v6M9 6l3 3 3-3" /></>),
  ask: svg(<path d="M4 5h16v11H9l-5 4V5Z" />),
  rewards: svg(<><circle cx="12" cy="9" r="5" /><path d="m9 13-1.5 8L12 19l4.5 2L15 13" /></>),
  you: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
};

const SHORTCUTS: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "live", label: "Live" },
  { key: "ask", label: "Ask Pelican" },
  { key: "rewards", label: "Rewards" },
];

function letterTone(letter: string): string {
  if (letter === "A" || letter === "B") return "bg-safe";
  if (letter === "C") return "bg-warn";
  return "bg-late";
}

/**
 * Round shortcuts under the search field, the way Maps lays out its favourites. No tab bar: each one opens its
 * section in the sheet. Home wears the home's grade letter once it is known.
 */
export function Shortcuts({ tab, onOpen, homeLetter }: { tab: Tab; onOpen: (t: Tab) => void; homeLetter: string | null }) {
  return (
    <nav aria-label="Sections" className="grid grid-cols-4 gap-1 px-3 pb-3 pt-3">
      {SHORTCUTS.map((s) => {
        const graded = s.key === "home" && homeLetter;
        return (
          <button
            key={s.key}
            type="button"
            aria-current={tab === s.key ? "page" : undefined}
            onClick={() => onOpen(s.key)}
            className="pressable flex min-h-11 flex-col items-center gap-1.5 rounded-[var(--radius-control)] py-1"
          >
            <span
              className={`grid size-[3.25rem] place-items-center rounded-full text-[1.375rem] font-bold
                ${graded ? `${letterTone(homeLetter)} text-white` : tab === s.key ? "bg-tint text-white" : "bg-fill text-tint"}`}
            >
              {graded ? homeLetter : ICONS[s.key]}
            </span>
            <span className={`text-footnote font-medium ${tab === s.key ? "text-label" : "text-label-2"}`}>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
