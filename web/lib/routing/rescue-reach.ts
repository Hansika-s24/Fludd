// Rescue reach: one widest-path search outward from every fire station at once.
// untilHour: the last whole hour a station can still reach the junction (null = always).
// reachableSegmentIds: roads open at the given hour AND joined to a station by roads open at that hour.
// A road is in that set when it is still open and one of its ends is connected past that hour.
import type { Hour, RescueReach } from "@/lib/types";
import { closeTime, lastOpenHour } from "./closing-hours";
import type { RoadGraph } from "./graph";
import { connectionCloseHours } from "./widest-path";

export function rescueReachFrom(
  graph: RoadGraph,
  closes: Uint16Array,
  stationNodes: number[],
  node: number,
  hour: Hour,
): RescueReach {
  const connectedUntil = connectionCloseHours(graph, closes, stationNodes);
  const reachableSegmentIds: number[] = [];
  for (let s = 0; s < graph.segmentCount; s++) {
    const open = closeTime(closes, s) > hour;
    const joined = connectedUntil[graph.segmentFrom[s]] > hour || connectedUntil[graph.segmentTo[s]] > hour;
    if (open && joined) reachableSegmentIds.push(s);
  }
  return { kind: "ok", untilHour: lastOpenHour(connectedUntil[node]), reachableSegmentIds };
}
