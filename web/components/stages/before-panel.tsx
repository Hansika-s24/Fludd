"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/components/onboarding/profile";
import { GradeCard } from "@/components/report-card/grade-card";
import { SituationAdvice } from "@/components/stages/situation-advice";
import { Group } from "@/components/ui/surface";
import { loadGold, loadLayer, loadLevels, peakBuildingDepth } from "@/lib/data";
import { distanceM } from "@/lib/grade";
import { findBetterOptions } from "@/lib/parcels";
import type { BetterOption, Grade } from "@/lib/types";
import { Icon, ListRow, useRemedies, type Place } from "./shared";

const HISTORY_RADIUS_M = 400;

interface Drainage {
  nearestPipe: { distanceM: number; diameterIn: number | null; kind: string } | null;
  inlets150: number;
  pump: { name: string; distanceM: number } | null;
}

/** Nearest vertex distance: fine for "how far is the nearest pipe" at this scale. */
function nearestOnLines(p: [number, number], fc: GeoJSON.FeatureCollection) {
  let best: { distanceM: number; props: Record<string, unknown> } | null = null;
  for (const f of fc.features) {
    const g = f.geometry;
    const lines = g?.type === "LineString" ? [g.coordinates] : g?.type === "MultiLineString" ? g.coordinates : [];
    for (const line of lines) for (const c of line) {
      const d = distanceM(p, [c[0], c[1]]);
      if (!best || d < best.distanceM) best = { distanceM: d, props: (f.properties ?? {}) as Record<string, unknown> };
    }
  }
  return best;
}

interface History {
  milton: number;
  knownFlooding: number;
  nearestMiltonM: number | null;
}

function pointsOf(fc: GeoJSON.FeatureCollection): [number, number][] {
  const out: [number, number][] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g?.type === "Point") out.push([g.coordinates[0], g.coordinates[1]]);
    else if (g?.type === "Polygon") out.push([g.coordinates[0][0][0], g.coordinates[0][0][1]]);
    else if (g?.type === "MultiPolygon") out.push([g.coordinates[0][0][0][0], g.coordinates[0][0][0][1]]);
  }
  return out;
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const miles = (m: number) => (m < 160 ? `${Math.round(m * 3.28)} ft` : `${(m / 1609).toFixed(1)} mi`);

/** Before a flood: is this a good place to live or build, what happened here before, how to make it safer. */
export function BeforePanel({ place, grade, onPick }: { place: Place; grade: Grade; onPick: (p: Place) => void }) {
  const [history, setHistory] = useState<History | null>(null);
  const [options, setOptions] = useState<BetterOption[] | null>(null);
  const [depth100, setDepth100] = useState<number | null>(null);
  const [drainage, setDrainage] = useState<Drainage | null>(null);
  const remedies = useRemedies(grade, depth100);
  const profile = useProfile();

  useEffect(() => {
    let stale = false;
    Promise.all([loadLayer("milton-damage"), loadLayer("known-flooding")])
      .then(([m, k]) => {
        if (stale) return;
        const md = pointsOf(m).map((p) => distanceM(place.position, p));
        const kd = pointsOf(k).map((p) => distanceM(place.position, p));
        setHistory({
          milton: md.filter((d) => d <= HISTORY_RADIUS_M).length,
          knownFlooding: kd.filter((d) => d <= HISTORY_RADIUS_M).length,
          nearestMiltonM: md.length ? Math.min(...md) : null,
        });
      })
      .catch(() => !stale && setHistory({ milton: 0, knownFlooding: 0, nearestMiltonM: null }));
    Promise.all([loadLayer("storm-pipes"), loadLayer("drains"), loadLayer("pump-stations")])
      .then(([pipes, drains, pumps]) => {
        if (stale) return;
        const pipe = nearestOnLines(place.position, pipes);
        const inlets = pointsOf(drains).filter((q) => distanceM(place.position, q) <= 150).length;
        let pump: Drainage["pump"] = null;
        for (const f of pumps.features) {
          if (f.geometry?.type !== "Point") continue;
          const d = distanceM(place.position, [f.geometry.coordinates[0], f.geometry.coordinates[1]]);
          const name = String((f.properties as Record<string, unknown> | null)?.SITE_NAME ?? "Pump station").trim();
          if (!pump || d < pump.distanceM) pump = { name, distanceM: d };
        }
        setDrainage({
          nearestPipe: pipe ? { distanceM: pipe.distanceM, diameterIn: typeof pipe.props.diameterIn === "number" ? pipe.props.diameterIn : null, kind: String(pipe.props.kind ?? "pipe") } : null,
          inlets150: inlets,
          pump,
        });
      })
      .catch(() => undefined);
    findBetterOptions(place.position).then((o) => !stale && setOptions(o), () => !stale && setOptions([]));
    Promise.all([loadGold(), loadLevels("100yr", "on")])
      .then(([g, l]) => {
        const d = peakBuildingDepth(g, l, place.position);
        if (!stale) setDepth100(d.kind === "ok" ? d.depthM : 0);
      })
      .catch(() => !stale && setDepth100(0));
    return () => {
      stale = true;
    };
  }, [place.position]);

  return (
    <>
      <GradeCard label={place.label} grade={grade} />

      <Group title="Flood history nearby">
        {history ? (
          <>
            <ListRow
              icon={Icon.history}
              tone={history.milton > 0 ? "warn" : "safe"}
              label={`Hurricane Milton damage within ${HISTORY_RADIUS_M} m`}
              value={history.milton === 0 ? "None recorded" : `${history.milton} damaged ${history.milton === 1 ? "property" : "properties"}`}
              detail={history.nearestMiltonM !== null ? `Nearest recorded damage: ${miles(history.nearestMiltonM)} away` : undefined}
            />
            <ListRow
              icon={Icon.home}
              tone={history.knownFlooding > 0 ? "warn" : "safe"}
              label={`City's known-flooding parcels within ${HISTORY_RADIUS_M} m`}
              value={history.knownFlooding === 0 ? "None listed" : `${history.knownFlooding} listed`}
              last
            />
          </>
        ) : (
          <p className="px-4 py-3 text-subhead text-label-2">Checking past floods…</p>
        )}
      </Group>

      <Group title="Drainage near you">
        {drainage ? (
          <>
            <ListRow
              icon={Icon.road}
              label="Nearest storm pipe"
              value={drainage.nearestPipe ? `${miles(drainage.nearestPipe.distanceM)} away` : "None mapped nearby"}
              detail={drainage.nearestPipe ? `${drainage.nearestPipe.kind === "channel" ? "Open channel" : drainage.nearestPipe.kind === "culvert" ? "Culvert" : "Underground pipe"}${drainage.nearestPipe.diameterIn ? `, ${drainage.nearestPipe.diameterIn} in across` : ""}` : undefined}
            />
            <ListRow
              icon={Icon.door}
              tone={drainage.inlets150 === 0 ? "warn" : "tint"}
              label="Street inlets within 150 m"
              value={drainage.inlets150 === 0 ? "None mapped" : `${drainage.inlets150}`}
              detail="Keep them clear of leaves before a storm. Turn the drainage layer on to see the network."
            />
            <ListRow
              icon={Icon.truck}
              label="Nearest pump station"
              value={drainage.pump ? `${drainage.pump.name.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}` : "None mapped"}
              detail={drainage.pump ? `${miles(drainage.pump.distanceM)} away. If it loses power, nearby low ground fills faster.` : undefined}
              last
            />
          </>
        ) : (
          <p className="px-4 py-3 text-subhead text-label-2">Mapping the drains around you…</p>
        )}
      </Group>

      {profile?.done && <SituationAdvice profile={profile} letter={grade.letter} />}

      <Group title="Make it safer">
        {remedies === null && <p className="px-4 py-3 text-subhead text-label-2">Working out what helps here…</p>}
        {remedies?.length === 0 && (
          <p className="px-4 py-3 text-subhead text-label-2">Suggestions are unavailable right now.</p>
        )}
        {remedies?.map((s, i) => (
          <ListRow key={i} icon={Icon.wrench} label={`Step ${i + 1}`} value={<span className="text-subhead font-normal">{s}</span>} last={i === remedies.length - 1} />
        ))}
      </Group>

      <Group title="Similar homes nearby with a better grade">
        {options === null && <p className="px-4 py-3 text-subhead text-label-2">Looking at homes within a mile…</p>}
        {options?.length === 0 && (
          <p className="px-4 py-3 text-subhead text-label-2">
            {grade.letter === "A" ? "This address already has the best grade." : "No similar homes with a better grade within a mile."}
          </p>
        )}
        {options?.slice(0, 5).map((o, i, all) => (
          <button
            key={o.address}
            type="button"
            onClick={() => onPick({ label: o.address, position: o.position })}
            className={`pressable flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill ${i < all.length - 1 ? "border-b border-separator" : ""}`}
          >
            <span className="w-7 text-center text-headline font-bold text-safe" aria-label={`Grade ${o.grade}`}>{o.grade}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-subhead font-medium">{o.address}</span>
              <span className="block text-footnote text-label-2">
                {money(o.assessedValue)} · {o.beds} bd · {o.baths} ba · {miles(o.distanceM)} away
              </span>
            </span>
            <span className="text-label-3" aria-hidden>›</span>
          </button>
        ))}
      </Group>
    </>
  );
}
