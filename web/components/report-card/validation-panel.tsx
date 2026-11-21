"use client";

import { useEffect, useState } from "react";
import { CountIn, stagger } from "@/components/stages/shared";
import { Group } from "@/components/ui/surface";
import { DATA_BASE } from "@/lib/config";
import { loadValidation } from "@/lib/data";
import type { Validation } from "@/lib/types";

/** How the model was checked against Hurricane Milton. Numbers straight from validation.json. */
export function ValidationPanel() {
  const [v, setV] = useState<Validation | null | "missing">(null);
  // Two counts validation.json carries beyond the contract's Validation type: damage outside FEMA's zones, and how
  // much of it the model caught. Read straight from the public file so the contract stays as agreed.
  const [extra, setExtra] = useState<{ hitsOutsideHighRisk?: number; outsideHighRisk?: number }>({});

  useEffect(() => {
    loadValidation().then(setV, () => setV("missing"));
    fetch(`${DATA_BASE}/validation.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { hitsOutsideHighRisk?: unknown; outsideHighRisk?: unknown }) => {
        const n = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : undefined);
        setExtra({ hitsOutsideHighRisk: n(j.hitsOutsideHighRisk), outsideHighRisk: n(j.outsideHighRisk) });
      })
      .catch(() => undefined);
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

  const fema = v.femaBaseline.insideHighRisk;
  const caughtMissed = extra.hitsOutsideHighRisk ?? null;
  const together = caughtMissed === null || !v.total ? null : Math.round(((fema + caughtMissed) / v.total) * 100);
  const pct = Math.round(v.hitRate * 1000) / 10;
  const femaPct = v.total ? Math.round((fema / v.total) * 100) : 0;
  const pctDecimals = Number.isInteger(pct) ? 0 : 1;
  const total = v.total < 1000 ? <CountIn value={v.total} /> : v.total.toLocaleString();
  return (
    <div className="rise-in">
      <Group title="How we checked the model">
        {together !== null ? (
          <div className="px-4 py-3">
            <p className="text-title font-bold tabular-nums">
              <CountIn value={together} />%
            </p>
            <p className="rise-in text-subhead" style={stagger(2)}>
              of the {total} homes and buildings the county recorded as flood-damaged in Hurricane Milton are flagged by Fludd and FEMA&apos;s map together. FEMA&apos;s map alone: {femaPct}%.
            </p>
          </div>
        ) : null}
        <div className="rise-in border-t border-separator px-4 py-3" style={stagger(4)}>
          <p className="text-subhead">
            {caughtMissed !== null && extra.outsideHighRisk
              ? <>Fludd found {caughtMissed} of the {extra.outsideHighRisk} damaged places FEMA&apos;s map missed. </>
              : null}
            On its own the model puts water at <CountIn value={pct} decimals={pctDecimals} />% of the damage points, in an area less than half the size of FEMA&apos;s zones. It was never tuned to these points: one check against one storm, not a guarantee.
          </p>
          <p className="mt-1 text-footnote text-label-2">Computed {new Date(v.computedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      </Group>
    </div>
  );
}
