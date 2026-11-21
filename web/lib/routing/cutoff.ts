// Cut-off time: the last whole hour any route from a junction to dry ground still exists.
// Dry ground = junctions whose roads never close for this vehicle. One widest-path search starts from
// all of them at once (roads work both ways, so "from dry ground to you" equals "from you to dry ground").
import type { CutoffResult } from "@/lib/types";
import { dryNodes, lastOpenHour } from "./closing-hours";
import type { RoadGraph } from "./graph";
import { connectionCloseHours } from "./widest-path";

export function cutoffFor(graph: RoadGraph, closes: Uint16Array, node: number): CutoffResult {
  const connectedUntil = connectionCloseHours(graph, closes, dryNodes(graph, closes));
  return { kind: "ok", lastHour: lastOpenHour(connectedUntil[node]) };
}
