// Best route now: time-dependent Dijkstra. The label of a junction is the earliest time you can be there.
// A road may be used only if you reach the far end of it strictly before it closes, so the route never
// relies on a road that floods while you are on it. Correct because closures only take options away:
// arriving earlier is never worse, so waiting never helps (the "FIFO" property, prep/04 section 4.3).
// Times are in hours from manifest.hourZero; travel uses each road's speed limit.
import type { Hour, RouteResult, VehicleClass } from "@/lib/types";
import { closeTime } from "./closing-hours";
import { MinHeap } from "./heap";
import { nodePositionOf, travelHours, type RoadGraph } from "./graph";
import { walkBack } from "./shortest-path";

export function findRoute(
  graph: RoadGraph,
  closes: Uint16Array,
  vehicle: VehicleClass,
  from: number,
  to: number,
  startHour: Hour,
): RouteResult {
  const arrival = new Float64Array(graph.nodeCount).fill(Infinity);
  const cameFrom = new Int32Array(graph.nodeCount).fill(-1);
  const heap = new MinHeap();
  arrival[from] = startHour;
  heap.push(startHour, from);

  for (let item = heap.pop(); item; item = heap.pop()) {
    const u = item.id;
    if (item.key > arrival[u]) continue; // stale entry
    if (u === to) break;
    for (let k = graph.firstLink[u]; k < graph.firstLink[u + 1]; k++) {
      const segment = graph.linkSegment[k];
      const reachEnd = arrival[u] + travelHours(graph, segment, vehicle);
      if (reachEnd >= closeTime(closes, segment)) continue; // closed by the time we would be through it
      const v = graph.linkTarget[k];
      if (reachEnd < arrival[v]) {
        arrival[v] = reachEnd;
        cameFrom[v] = u;
        heap.push(reachEnd, v);
      }
    }
  }

  if (arrival[to] === Infinity) return { kind: "no_route" };
  const nodes = walkBack(cameFrom, to);
  return {
    kind: "ok",
    line: nodes.map((n) => nodePositionOf(graph, n)),
    minutes: Math.ceil((arrival[to] - startHour) * 60), // rounded up: never promise a faster trip
  };
}
