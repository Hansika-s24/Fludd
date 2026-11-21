"use client";

import { useEffect, useState } from "react";
import { ReportFlow } from "@/components/report/report-flow";
import { Group } from "@/components/ui/surface";
import { loadGold, loadLevels, peakBuildingDepth } from "@/lib/data";
import type { Grade } from "@/lib/types";
import { BAND_WORDS, bandOf, Icon, ListRow, useRemedies, type Place } from "./shared";

interface Replay {
  pumpOn: number;
  pumpOff: number;
  depth100: number;
}

/** After a flood: what Milton did here, what the pumps changed, and what to improve. */
export function AfterPanel({ place, grade, onReplay }: { place: Place; grade: Grade; onReplay: () => void }) {
  const [replay, setReplay] = useState<Replay | null>(null);
  const [reporting, setReporting] = useState(false);
  const remedies = useRemedies(grade, replay?.depth100 ?? null);

  useEffect(() => {
    let stale = false;
    Promise.all([loadGold(), loadLevels("milton", "on"), loadLevels("milton", "off"), loadLevels("100yr", "on")])
      .then(([g, on, off, hundred]) => {
        const d = (l: typeof on) => {
          const r = peakBuildingDepth(g, l, place.position);
          return r.kind === "ok" ? r.depthM : 0;
        };
        if (!stale) setReplay({ pumpOn: d(on), pumpOff: d(off), depth100: d(hundred) });
      })
      .catch(() => !stale && setReplay({ pumpOn: 0, pumpOff: 0, depth100: 0 }));
    return () => {
      stale = true;
    };
  }, [place.position]);

  const pumpMattered = replay !== null && bandOf(replay.pumpOff) !== bandOf(replay.pumpOn);

  return (
    <>
      <Group title="What Hurricane Milton did here">
        {replay ? (
          <>
            <ListRow
              icon={Icon.door}
              tone={replay.pumpOn >= 0.15 ? "late" : replay.pumpOn > 0.02 ? "warn" : "safe"}
              label="Peak water at the door, Oct 9 to 11, 2024"
              value={BAND_WORDS[bandOf(replay.pumpOn)]}
              detail="Modelled from Milton's rainfall, checked against the county's recorded damage."
            />
            <ListRow
              icon={Icon.alert}
              tone={pumpMattered ? "warn" : "safe"}
              label="If the pump stations had lost power"
              value={BAND_WORDS[bandOf(replay.pumpOff)]}
              detail={pumpMattered ? "The pumps made the difference here. Ask the city about backup power." : "The pumps made little difference at this address."}
              last
            />
          </>
        ) : (
          <p className="px-4 py-3 text-subhead text-label-2">Replaying Milton…</p>
        )}
        <div className="border-t border-separator px-4 py-3">
          <button
            type="button"
            onClick={onReplay}
            className="pressable h-11 w-full rounded-[var(--radius-control)] bg-tint text-body font-semibold text-white active:bg-tint-pressed"
          >
            Replay Milton on the map
          </button>
        </div>
      </Group>

      <Group title="What you can improve">
        {remedies === null && <p className="px-4 py-3 text-subhead text-label-2">Working out what helps here…</p>}
        {remedies?.length === 0 && <p className="px-4 py-3 text-subhead text-label-2">Suggestions are unavailable right now.</p>}
        {remedies?.map((s, i) => (
          <ListRow key={i} icon={Icon.wrench} label={`Step ${i + 1}`} value={<span className="text-subhead font-normal">{s}</span>} last={i === remedies.length - 1} />
        ))}
      </Group>

      <Group title="Report what you saw">
        {reporting ? (
          <ReportFlow onClose={() => setReporting(false)} />
        ) : (
          <div className="px-4 py-3">
            <p className="text-subhead text-label-2">
              Photos of flooding help us check the model. A person reviews every photo before it appears on the map.
            </p>
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="pressable mt-3 h-11 w-full rounded-[var(--radius-control)] bg-fill text-body font-medium text-tint"
            >
              Report flooding
            </button>
          </div>
        )}
      </Group>
    </>
  );
}
