"use client";

export type Stage = "before" | "during" | "after";

const STAGES: { key: Stage; label: string }[] = [
  { key: "before", label: "Before" },
  { key: "during", label: "During" },
  { key: "after", label: "After" },
];

/** Segmented control: plan ahead, get through it, learn from it. */
export function StageControl({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  return (
    <div role="tablist" aria-label="When" className="mx-4 mt-3 grid grid-cols-3 gap-0.5 rounded-[var(--radius-control)] bg-fill p-0.5">
      {STAGES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="tab"
          id={`stage-${s.key}`}
          aria-selected={stage === s.key}
          aria-controls="stage-panel"
          onClick={() => onChange(s.key)}
          className={`pressable h-9 rounded-[calc(var(--radius-control)-2px)] text-subhead font-medium
            ${stage === s.key ? "bg-group text-label shadow-[var(--shadow-control)]" : "text-label-2"}`}
        >
          {s.label} a flood
        </button>
      ))}
    </div>
  );
}
