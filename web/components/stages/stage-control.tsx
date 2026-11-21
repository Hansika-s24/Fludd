"use client";

import type { ReactNode } from "react";

export type Stage = "before" | "during" | "after";

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

export const STAGES: { key: Stage; title: string; detail: string; icon: ReactNode }[] = [
  {
    key: "before",
    title: "Plan a move",
    detail: "Grade, history, fixes",
    icon: svg(<><path d="m3 11 9-7 9 7M5 10v10h14V10" /><circle cx="12" cy="14" r="2.5" /><path d="m14 16 2 2" /></>),
  },
  {
    key: "during",
    title: "Storm mode",
    detail: "Water hour by hour",
    icon: svg(<><path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 18 9a3.5 3.5 0 0 1 0 7H7" /><path d="m11 18-1.5 3M15 18l-1.5 3" /></>),
  },
  {
    key: "after",
    title: "After a flood",
    detail: "Milton here, report",
    icon: svg(<><path d="M3 18c2 0 2-1.5 4-1.5S9 18 11 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5" /><path d="M12 3v9M8.5 8.5 12 12l3.5-3.5" /></>),
  },
];

/** Three feature cards: plan a move, get through a storm, learn from one. Each also sets what the map shows. */
export function StageControl({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  return (
    <div role="tablist" aria-label="What do you need" className="grid grid-cols-3 gap-2 px-4 pt-1">
      {STAGES.map((s) => {
        const on = stage === s.key;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            id={`stage-${s.key}`}
            aria-selected={on}
            aria-controls="stage-panel"
            onClick={() => onChange(s.key)}
            className={`pressable flex min-h-[5.5rem] flex-col items-start justify-between rounded-[var(--radius-group)] p-3 text-left transition-colors duration-200
              ${on ? "bg-tint text-white shadow-[0_6px_16px_rgb(10_108_255/0.28)]" : "bg-group text-label"}`}
          >
            <span className={on ? "text-white" : "text-tint"}>{s.icon}</span>
            <span>
              <span className="block text-subhead font-semibold leading-tight">{s.title}</span>
              <span className={`block text-[0.6875rem] leading-tight ${on ? "text-white/80" : "text-label-2"}`}>{s.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
