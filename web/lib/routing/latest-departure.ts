// "Move your car by": a backward search from dry parking (junctions whose roads never close for a car).
// Label L[u] = the latest time you can leave junction u and still drive to dry parking.
//   L[dry] = Infinity.  Through road e from u to v:  L[u] = min(closing hour of e, L[v]) - drive time of e.
// Each junction keeps its best (largest) L and remembers which dry junction it leads to.
// Labels only shrink along the search, so popping the largest first settles each junction once.
// The car itself is treated as at risk once any road touching its junction closes (we know road depths,
// not the depth at the kerb), so the answer is the earlier of that and L, as the last whole hour before it.
import type { LatestDeparture } from "@/lib/types";
import { closeTime, dryNodes, lastOpenHour, nodeFloodHour } from "./closing-hours";
import { MinHeap } from "./heap";
import { nodePositionOf, travelHours, type RoadGraph } from "./graph";

export function latestDepartureFor(graph: RoadGraph, carCloses: Uint16Array, node: number): LatestDeparture {
  if (nodeFloodHour(graph, carCloses, node) === Infinity) {
    return { kind: "ok", moveByHour: null, parking: null }; // dry already: no move needed
  }

  const leaveBy = new Float64Array(graph.nodeCount).fill(-Infinity);
  const leadsTo = new Int32Array(graph.nodeCount).fill(-1);
  const heap = new MinHeap(); // keys are negated, so the largest label pops first
  for (const d of dryNodes(graph, carCloses)) {
    leaveBy[d] = Infinity;
    leadsTo[d] = d;
    heap.push(-Infinity, d);
  }

  for (let item = heap.pop(); item; item = heap.pop()) {
    const v = item.id;
    if (-item.key < leaveBy[v]) continue; // stale entry
    for (let k = graph.firstLink[v]; k < graph.firstLink[v + 1]; k++) {
      const u = graph.linkTarget[k]; // we step backwards: a car at u would drive this road to v
      const segment = graph.linkSegment[k];
      const latest = Math.min(closeTime(carCloses, segment), leaveBy[v]) - travelHours(graph, segment, "car");
      if (latest > leaveBy[u]) {
        leaveBy[u] = latest;
        leadsTo[u] = leadsTo[v];
        heap.push(-latest, u);
      }
    }
  }

  const parkingNode = leadsTo[node];
  if (parkingNode === -1) return { kind: "ok", moveByHour: -1, parking: null }; // no dry parking reachable at all
  const deadline = Math.min(nodeFloodHour(graph, carCloses, node), leaveBy[node]);
  return {
    kind: "ok",
    moveByHour: lastOpenHour(deadline),
    parking: { name: `High ground at junction ${parkingNode}`, position: nodePositionOf(graph, parkingNode) },
  };
}
