"use client";

import type { ReactNode } from "react";
import { TAB_BAR_PX } from "./sheet";

export type Tab = "home" | "live" | "ask" | "rewards" | "you";

const svg = (d: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "home", label: "Home", icon: svg(<path d="m3 11 9-7 9 7M5 10v10h14V10" />) },
  { key: "live", label: "Live", icon: svg(<><path d="M2 14c2 0 2-1.5 4-1.5S8 14 10 14s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M12 3v6M9 6l3 3 3-3" /></>) },
  { key: "ask", label: "Ask Pelican", icon: svg(<path d="M4 5h16v11H9l-5 4V5Z" />) },
  { key: "rewards", label: "Rewards", icon: svg(<><circle cx="12" cy="9" r="5" /><path d="m9 13-1.5 8L12 19l4.5 2L15 13" /></>) },
  { key: "you", label: "You", icon: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>) },
];

/** Phone: a bottom tab bar. Desktop: the same tabs as a compact row at the top of the sidebar. */
export function TabBar({ tab, onChange, narrow }: { tab: Tab; onChange: (t: Tab) => void; narrow: boolean }) {
  const buttons = TABS.map((t) => (
    <button
      key={t.key}
      type="button"
      role="tab"
      aria-selected={tab === t.key}
      aria-controls="tab-panel"
      id={`tab-${t.key}`}
      onClick={() => onChange(t.key)}
      className={`pressable flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium
        ${tab === t.key ? "text-tint" : "text-label-2"}`}
    >
      {t.icon}
      <span>{t.label}</span>
    </button>
  ));

  if (!narrow) {
    return (
      <nav role="tablist" aria-label="Sections" className="mx-3 mt-2 flex rounded-[var(--radius-control)] bg-fill p-0.5">
        {buttons}
      </nav>
    );
  }
  return (
    <nav
      role="tablist"
      aria-label="Sections"
      style={{ height: `calc(${TAB_BAR_PX}px + env(safe-area-inset-bottom))` }}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-separator bg-[oklch(0.98_0.003_260)] px-1 pb-[env(safe-area-inset-bottom)]"
    >
      {buttons}
    </nav>
  );
}
