// The five contract functions, done for real: load the data, snap positions, run one search.
// This file runs inside the Web Worker (worker.ts); index.ts calls it directly where no worker exists.
// Wording rule: nothing here says a road is safe. Answers are closing hours, roads still open, and
// times to leave by, each rounded to the cautious side.
import type {
  ClosingHours, CutoffResult, Hour, LatestDeparture, LngLat, PumpState, RescueReach, RouteResult, Scenario, VehicleClass,
} from "@/lib/types";
import { findRoute } from "./best-route";
import { computeClosingHours } from "./closing-hours";
import { cutoffFor } from "./cutoff";
import { loadFireStations, loadRoadGraph, loadScenarioLevels, loadSegments, loadStudyBox, remember } from "./data";
import { nearestNode } from "./graph";
import { latestDepartureFor } from "./latest-departure";
import { rescueReachFrom } from "./rescue-reach";

/** Computed once per scenario and pump state, then reused. */
function closingHoursCached(scenario: Scenario, pump: PumpState): Promise<ClosingHours> {
  return remember(`closing/${scenario}/${pump}`, async () => {
    const [segments, levels] = await Promise.all([loadSegments(), loadScenarioLevels(scenario, pump)]);
    return computeClosingHours(segments, levels);
  });
}

/** Nearest junction, or null when the position is outside the study box. */
async function snap(position: LngLat): Promise<number | null> {
  const [[west, south, east, north], graph] = await Promise.all([loadStudyBox(), loadRoadGraph()]);
  const [lng, lat] = position;
  if (lng < west || lng > east || lat < south || lat > north) return null;
  return nearestNode(graph, position);
}

export async function closingHours(scenario: Scenario, pump: PumpState): Promise<ClosingHours> {
  const cached = await closingHoursCached(scenario, pump);
  const copy = {} as ClosingHours;
  for (const vehicle of Object.keys(cached) as VehicleClass[]) copy[vehicle] = cached[vehicle].slice();
  return copy; // a copy, so callers cannot change the cached answer
}

export async function bestRoute(
  from: LngLat, to: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState, startHour: Hour,
): Promise<RouteResult> {
  const [graph, hours, start, end] = await Promise.all([loadRoadGraph(), closingHoursCached(scenario, pump), snap(from), snap(to)]);
  if (start === null || end === null) return { kind: "no_route" };
  return findRoute(graph, hours[vehicle], vehicle, start, end, startHour);
}

export async function cutoffTime(position: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState): Promise<CutoffResult> {
  const [graph, hours, node] = await Promise.all([loadRoadGraph(), closingHoursCached(scenario, pump), snap(position)]);
  if (node === null) return { kind: "outside" };
  return cutoffFor(graph, hours[vehicle], node);
}

export async function rescueReach(
  position: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState, hour: Hour,
): Promise<RescueReach> {
  const [graph, hours, node, stations] = await Promise.all([
    loadRoadGraph(), closingHoursCached(scenario, pump), snap(position), loadFireStations(),
  ]);
  if (node === null) return { kind: "outside" };
  const stationNodes = stations.map((p) => nearestNode(graph, p));
  return rescueReachFrom(graph, hours[vehicle], stationNodes, node, hour);
}

export async function latestDeparture(position: LngLat, scenario: Scenario, pump: PumpState): Promise<LatestDeparture> {
  const [graph, hours, node] = await Promise.all([loadRoadGraph(), closingHoursCached(scenario, pump), snap(position)]);
  if (node === null) return { kind: "outside" };
  return latestDepartureFor(graph, hours.car, node);
}
