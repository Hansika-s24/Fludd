"use client";

import { useState, type CSSProperties } from "react";
import { Group } from "@/components/ui/surface";
import type { Grade } from "@/lib/types";
import { checklist, type Lens, type Level } from "./checklist";

const LENSES: { key: Lens; label: string }[] = [
  { key: "buying", label: "Buying" },
  { key: "renting", label: "Renting" },
  { key: "building", label: "Building" },
];
// The word carries the meaning; the colour only repeats it.
const LEVEL: Record<Level, { word: string; text: string; dot: string }> = {
  good: { word: "Looks fine", text: "text-safe", dot: "bg-safe" },
  watch: { word: "Check this", text: "text-warn", dot: "bg-warn" },
  act: { word: "Act on this", text: "text-late", dot: "bg-late" },
};

/**
 * For someone who does not live here yet: pick buying, renting or building, and the report becomes a short
 * checklist for that decision. Nothing is saved; the choice lasts as long as this address is open.
 */
export function PropertyCheck({ grade }: { grade: Grade }) {
  const [lens, setLens] = useState<Lens | null>(null);
  return (
    <Group title="Thinking of moving or building here?">
      <div role="radiogroup" aria-label="What are you planning for this address?" className="grid grid-cols-3 gap-1 p-1.5">
        {LENSES.map((l) => (
          <button
            key={l.key}
            type="button"
            role="radio"
            aria-checked={lens === l.key}
            onClick={() => setLens(l.key)}
            className={`pressable min-h-11 rounded-[var(--radius-control)] text-subhead font-semibold transition-colors duration-150 ${
              lens === l.key ? "bg-tint text-white" : "bg-fill text-label"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {lens === null ? (
        <p className="px-4 pb-4 pt-1 text-subhead text-label-2">Pick one and Fludd turns this report into a checklist for that decision.</p>
      ) : (
        <div aria-live="polite">
          <ul key={lens}>
            {checklist(lens, grade).map((item, i) => (
              <li key={item.title} className="rise-in border-t border-separator px-4 py-3" style={{ "--i": i } as CSSProperties}>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-subhead font-semibold">{item.title}</span>
                  <span className={`flex shrink-0 items-center gap-1.5 text-footnote font-medium ${LEVEL[item.level].text}`}>
                    <span aria-hidden className={`h-2 w-2 rounded-full ${LEVEL[item.level].dot}`} />
                    {LEVEL[item.level].word}
                  </span>
                </p>
                <p className="mt-0.5 text-subhead">{item.finding}</p>
                <p className="mt-0.5 text-subhead text-label-2">{item.todo}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-separator px-4 py-3 text-footnote text-label-3">
            A screening estimate from a simplified model, not a flood determination. Confirm with the disclosure, an insurer and a surveyor before you sign.
          </p>
        </div>
      )}
    </Group>
  );
}
