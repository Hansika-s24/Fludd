"use client";

import { useEffect, useState } from "react";
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
      <Group title="How we checked the model">
        <p className="px-4 py-3 text-subhead text-label-2">The check against Hurricane Milton is not available right now.</p>
      </Group>
    );
  }
  if (!v) return null;

  const pct = Math.round(v.hitRate * 1000) / 10;
  const femaPct = v.femaBaseline.total ? Math.round((v.femaBaseline.insideHighRisk / v.femaBaseline.total) * 100) : 0;
  return (
    <Group title="How we checked the model">
      <div className="px-4 py-3">
        <p className="text-title font-bold tabular-nums">{pct}%</p>
        <p className="text-subhead">
          of the {v.total.toLocaleString()} flood-damage points the county recorded in Hurricane Milton fall where the model puts water.
        </p>
      </div>
      <div className="border-t border-separator px-4 py-3">
        <p className="text-subhead">
          FEMA&apos;s high-risk zones held {femaPct}% of them, over a much larger area. The model is one check against one storm, not a guarantee.
        </p>
        <p className="mt-1 text-footnote text-label-2">Computed {new Date(v.computedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      </div>
    </Group>
  );
}
