// When each road segment closes, per vehicle class, for one scenario (contract definition):
// a segment closes at the first hour when the water at its lowest point reaches the class's depth limit.
// Depth at the lowest point in bowl b at hour t = max(0, level[b][t] - lowest ground of the segment in b).
// A segment crossing several bowls closes when the first of them gets too deep. 65535 = never closes.
// Once closed, a segment stays closed for the rest of the scenario (cautious: we never reopen a road).
import { VEHICLE_CLASSES, type ClosingHours, type Levels, type VehicleClass } from "@/lib/types";
import type { SegmentBowls } from "./data";
import type { RoadGraph } from "./graph";

export const NEVER = 65535;

/** Deepest water each class can cross, metres (docs/contracts.md, sources in prep/04 section 3). */
export const VEHICLE_LIMITS_M: Record<VehicleClass, number> = {
  foot: 0.3,
  car: 0.15,
  suv: 0.3,
  fire_engine: 0.25,
  high_water: 0.75,
};

/** Levels are stored to the centimetre; this stops 12.00 - 11.85 = 0.1499999 from missing a 0.15 m limit. */
const ROUNDING_SLACK_M = 1e-9;

export function computeClosingHours(segments: SegmentBowls[], levels: Levels): ClosingHours {
  const out = {} as ClosingHours;
  for (const vehicle of VEHICLE_CLASSES) {
    const limit = VEHICLE_LIMITS_M[vehicle];
    const closes = new Uint16Array(segments.length).fill(NEVER);
    segments.forEach((segment, id) => {
      for (const { bowl, lowestGroundM } of segment.bowls) {
        const series = levels.levels[String(bowl)];
        if (!series) throw new Error(`levels for ${levels.scenario} pump ${levels.pump} have no bowl ${bowl} (segment ${id})`);
        for (let hour = 0; hour < series.length && hour < closes[id]; hour++) {
          const depth = Math.max(0, series[hour] - lowestGroundM);
          if (depth >= limit - ROUNDING_SLACK_M) {
            closes[id] = hour;
            break;
          }
        }
      }
    });
    out[vehicle] = closes;
  }
  return out;
}

/** Closing hour as a number for the searches: Infinity when the segment never closes. */
export function closeTime(closes: Uint16Array, segment: number): number {
  return closes[segment] === NEVER ? Infinity : closes[segment];
}

/** Junctions where every road touching them stays open all scenario: our "dry ground". */
export function dryNodes(graph: RoadGraph, closes: Uint16Array): number[] {
  const dry: number[] = [];
  for (let u = 0; u < graph.nodeCount; u++) {
    let allOpen = graph.firstLink[u] < graph.firstLink[u + 1]; // a junction with no roads is not a destination
    for (let k = graph.firstLink[u]; k < graph.firstLink[u + 1]; k++) {
      if (closes[graph.linkSegment[k]] !== NEVER) allOpen = false;
    }
    if (allOpen) dry.push(u);
  }
  return dry;
}

/** The first hour any road touching this junction closes (Infinity if none do). */
export function nodeFloodHour(graph: RoadGraph, closes: Uint16Array, node: number): number {
  let first = Infinity;
  for (let k = graph.firstLink[node]; k < graph.firstLink[node + 1]; k++) {
    first = Math.min(first, closeTime(closes, graph.linkSegment[k]));
  }
  return first;
}

/**
 * A closing hour turned into "the last whole hour it is still open": hour 9 closing -> 8.
 * Infinity (never closes) -> null. -1 means "already closed at hour 0".
 */
export function lastOpenHour(closesAt: number): number | null {
  if (closesAt === Infinity) return null;
  return Math.max(-1, Math.ceil(closesAt) - 1);
}
