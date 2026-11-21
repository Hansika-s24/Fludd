// STUB (Harshith's 11:00 scaffold). Hansika replaces these; names and types stay as in docs/contracts.md.
import {
  VEHICLE_CLASSES,
  type ClosingHours, type CutoffResult, type Hour, type LatestDeparture, type LngLat, type PumpState,
  type RescueReach, type RouteResult, type Scenario, type VehicleClass,
} from "@/lib/types";

const TOY_SEGMENTS = 12;
const NEVER = 65535;

/** STUB: segment 3 closes at hour 9 for cars, everything else never. */
export async function closingHours(_scenario: Scenario, _pump: PumpState): Promise<ClosingHours> {
  const out = {} as ClosingHours;
  for (const c of VEHICLE_CLASSES) {
    const a = new Uint16Array(TOY_SEGMENTS).fill(NEVER);
    if (c === "car") a[3] = 9;
    out[c] = a;
  }
  return out;
}

/** STUB: a straight line at 30 km/h. */
export async function bestRoute(
  from: LngLat, to: LngLat, _vehicle: VehicleClass, _scenario: Scenario, _pump: PumpState, _startHour: Hour,
): Promise<RouteResult> {
  const km = Math.hypot((to[0] - from[0]) * 98, (to[1] - from[1]) * 111);
  return { kind: "ok", line: [from, to], minutes: Math.max(1, Math.round((km / 30) * 60)) };
}

/** STUB */
export async function cutoffTime(_p: LngLat, _v: VehicleClass, _s: Scenario, _pump: PumpState): Promise<CutoffResult> {
  return { kind: "ok", lastHour: 11 };
}

/** STUB */
export async function rescueReach(_p: LngLat, _v: VehicleClass, _s: Scenario, _pump: PumpState, _hour: Hour): Promise<RescueReach> {
  return { kind: "ok", untilHour: 12, reachableSegmentIds: [0, 1, 2, 4, 5, 6] };
}

/** STUB: "move your car by" hour 10 (6 pm with the toy hour zero), to a toy garage. */
export async function latestDeparture(_p: LngLat, _s: Scenario, _pump: PumpState): Promise<LatestDeparture> {
  return { kind: "ok", moveByHour: 10, parking: { name: "Toy parking garage", position: [-82.4185, 28.0628] } };
}
