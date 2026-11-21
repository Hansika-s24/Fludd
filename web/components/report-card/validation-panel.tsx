"use client";

import { useEffect, useState } from "react";
import { CountIn, stagger } from "@/components/stages/shared";
import { Group } from "@/components/ui/surface";
import { loadValidation } from "@/lib/data";
import type { Validation } from "@/lib/types";

/** How the model was checked against Hurricane Milton. Numbers straight from validation.json. */
export function ValidationPanel() {
  const [v, setV] = useState<Validation | null | "missing">(null);

  useEffect(() => {
    loadValidation().then(setV, () => setV("missing"));
  }, []);

  if (v === "missing") {
    return (
      <div className="rise-in">
        <Group title="How we checked the model">
          <p className="px-4 py-3 text-subhead text-label-2">The check against Hurricane Milton is not available right now.</p>
        </Group>
      </div>
    );
  }
  if (!v) return null;

  const pct = Math.round(v.hitRate * 1000) / 10;
  const femaPct = v.femaBaseline.total ? Math.round((v.femaBaseline.insideHighRisk / v.femaBaseline.total) * 100) : 0;
  // Counting must print the same digits as before: one decimal unless the percentage is whole,
  // and no counting where the total would need a thousands separator.
  const pctDecimals = Number.isInteger(pct) ? 0 : 1;
  const total = v.total < 1000 ? <CountIn value={v.total} /> : v.total.toLocaleString();
  // The group arrives once the file has loaded, so it rises in as one piece and its numbers count to their value.
  return (
    <div className="rise-in">
      <Group title="How we checked the model">
        <div className="px-4 py-3">
          <p className="text-title font-bold tabular-nums">
            <CountIn value={pct} decimals={pctDecimals} />%
          </p>
          <p className="rise-in text-subhead" style={stagger(2)}>
            of the {total} flood-damage points the county recorded in Hurricane Milton fall where the model puts water.
          </p>
        </div>
        <div className="rise-in border-t border-separator px-4 py-3" style={stagger(4)}>
          <p className="text-subhead">
            FEMA&apos;s high-risk zones held <CountIn value={femaPct} />% of them, over a much larger area. The model is one check against one storm, not a guarantee.
          </p>
          <p className="mt-1 text-footnote text-label-2">Computed {new Date(v.computedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      </Group>
    </div>
  );
}
