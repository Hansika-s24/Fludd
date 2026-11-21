"use client";

import { useEffect, useState } from "react";
import { StormControls, type StormControlsProps } from "@/components/map/storm-controls";
import { Group } from "@/components/ui/surface";
import { depthAtBuilding } from "@/lib/data";
import { cutoffTime, latestDeparture, rescueReach } from "@/lib/routing";
import type { CutoffResult, Grade, LatestDeparture, RescueReach } from "@/lib/types";
import { aboutTime, BAND_WORDS, bandOf, Icon, ListRow, Thinking, type Place } from "./shared";

interface Alert {
  event: string;
  headline: string;
  severity?: string;
}

interface Live {
  depthM: number | null;
  move: LatestDeparture | null;
  rescue: RescueReach | null;
  cutoff: CutoffResult | null;
}

/** During a flood: what's at the door now, when to move the car, whether help can reach you, alerts. */
export function DuringPanel({
  place, car, grade, controls,
}: {
  place: Place;
  car: Place | null;
  grade: Grade;
  controls: StormControlsProps;
}) {
  const { scenario, pump, hour, hourZero } = controls;
  const [live, setLive] = useState<Live>({ depthM: null, move: null, rescue: null, cutoff: null });
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [routingError, setRoutingError] = useState(false);

  useEffect(() => {
    let stale = false;
    const [lng, lat] = place.position;
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ alerts?: Alert[] }>) : { alerts: [] }))
      .then((j) => !stale && setAlerts(j.alerts ?? []))
      .catch(() => !stale && setAlerts([]));
    return () => {
      stale = true;
    };
  }, [place.position]);

  useEffect(() => {
    let stale = false;
    depthAtBuilding(place.position, scenario, pump, hour)
      .then((d) => !stale && setLive((l) => ({ ...l, depthM: d.kind === "ok" ? d.depthM : null })))
      .catch(() => undefined);
    Promise.all([
      latestDeparture((car ?? place).position, scenario, pump),
      rescueReach(place.position, "fire_engine", scenario, pump, hour),
      cutoffTime(place.position, "car", scenario, pump),
    ])
      .then(([move, rescue, cutoff]) => !stale && setLive((l) => ({ ...l, move, rescue, cutoff })))
      .catch(() => !stale && setRoutingError(true));
    return () => {
      stale = true;
    };
  }, [place.position, car, scenario, pump, hour]);

  const at = (h: number) => (hourZero ? aboutTime(hourZero, h) : `hour ${h}`);
  const { move, rescue, cutoff } = live;

  return (
    <>
      {alerts && alerts.length > 0 && (
        // Alerts land after the panel is up, so the whole group rises in rather than appearing.
        <div className="rise-in">
          <Group>
            {alerts.map((a, i) => (
              <ListRow key={i} icon={Icon.alert} tone="warn" label="National Weather Service" value={a.event} detail={a.headline} i={i} last={i === alerts.length - 1} />
            ))}
          </Group>
        </div>
      )}

      <Group title={`At ${place.label.split(",")[0]}`}>
        <ListRow
          icon={Icon.door}
          tone={live.depthM === null ? "tint" : live.depthM >= 0.15 ? "late" : live.depthM > 0.02 ? "warn" : "safe"}
          label={`Water at the door, ${at(hour)}`}
          value={live.depthM === null ? Thinking : BAND_WORDS[bandOf(live.depthM)]}
          detail={`Grade ${grade.letter} for this address`}
        />

        {routingError ? (
          <p className="swap-in px-4 py-3 text-subhead text-label-2" role="status">Road answers are unavailable right now. Follow official instructions.</p>
        ) : (
          <>
            <MoveCarRow move={move} hour={hour} at={at} fromCar={car !== null} />
            <ListRow
              icon={Icon.truck}
              tone={!rescue || rescue.kind !== "ok" ? "tint" : rescue.untilHour === null ? "safe" : rescue.untilHour < hour ? "late" : "warn"}
              label="Fire trucks can reach you"
              value={
                !rescue ? Thinking
                  : rescue.kind !== "ok" ? "Road model not available here yet"
                  : rescue.untilHour === null ? "All through this storm"
                  : rescue.untilHour < 0 ? "Already cut off"
                  : rescue.untilHour < hour ? `Only until ${at(rescue.untilHour)}, now cut off`
                  : `Until ${at(rescue.untilHour)}`
              }
              i={2}
            />
            <ListRow
              icon={Icon.road}
              tone={!cutoff || cutoff.kind !== "ok" ? "tint" : cutoff.lastHour === null ? "safe" : cutoff.lastHour < hour ? "late" : "warn"}
              label="Last way out by car"
              value={
                !cutoff ? Thinking
                  : cutoff.kind !== "ok" ? "Road model not available here yet"
                  : cutoff.lastHour === null ? "Roads stay open in this storm"
                  : cutoff.lastHour < 0 ? "Already cut off"
                  : cutoff.lastHour < hour ? `Closed after ${at(cutoff.lastHour)}`
                  : `Leave before ${at(cutoff.lastHour)}`
              }
              detail="Never drive or walk into floodwater, even if the app shows a road open."
              i={3}
              last
            />
          </>
        )}
      </Group>

      <Group title="Storm">
        <StormControls {...controls} />
      </Group>
    </>
  );
}

function MoveCarRow({ move, hour, at, fromCar }: { move: LatestDeparture | null; hour: number; at: (h: number) => string; fromCar: boolean }) {
  const label = fromCar ? "Move your car by" : "Move a car parked here by";
  if (!move) return <ListRow icon={Icon.car} label={label} value={Thinking} i={1} />;
  if (move.kind !== "ok") return <ListRow icon={Icon.car} label={label} value="Road model not available here yet" i={1} />;
  if (move.moveByHour === null) return <ListRow icon={Icon.car} tone="safe" label={label} value="No move needed in this storm" i={1} />;
  if (move.moveByHour < 0 || !move.parking) {
    return <ListRow icon={Icon.car} tone="late" label={label} value="Too late to move it safely" detail="Leave it. Never drive into floodwater." i={1} />;
  }
  const passed = move.moveByHour < hour;
  return (
    <ListRow
      icon={Icon.car}
      tone={passed ? "late" : "warn"}
      label={label}
      value={passed ? `Moment passed at ${at(move.moveByHour)}` : `Before ${at(move.moveByHour)}`}
      detail={passed ? "Leave it. Never drive into floodwater." : `Dry ground: ${move.parking.name}`}
      i={1}
    />
  );
}
