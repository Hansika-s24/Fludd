// Max-min ("widest path") Dijkstra over closing hours, from one or more starting junctions at once.
// For every junction it answers: "what is the latest closing hour of the weakest road on the best path
// from any start to here?" That is the moment this junction loses its last connection to the starts.
// Same loop as Dijkstra, except a path's value is the MIN of its roads' closing hours (its weakest link)
// and we keep the MAX over paths, popping the largest label first.
// Travel time is ignored: trips take minutes, the flood moves in hourly steps.
import { closeTime } from "./closing-hours";
import { MinHeap } from "./heap";
import type { RoadGraph } from "./graph";

/** Infinity = always connected; -Infinity = never connected. */
export function connectionCloseHours(graph: RoadGraph, closes: Uint16Array, starts: number[]): Float64Array {
  const best = new Float64Array(graph.nodeCount).fill(-Infinity);
  const heap = new MinHeap(); // keys are negated, so the largest label pops first
  for (const s of starts) {
    best[s] = Infinity;
    heap.push(-Infinity, s);
  }

  for (let item = heap.pop(); item; item = heap.pop()) {
    const u = item.id;
    if (-item.key < best[u]) continue; // stale entry
    for (let k = graph.firstLink[u]; k < graph.firstLink[u + 1]; k++) {
      const v = graph.linkTarget[k];
      const weakest = Math.min(best[u], closeTime(closes, graph.linkSegment[k]));
      if (weakest > best[v]) {
        best[v] = weakest;
        heap.push(-weakest, v);
      }
    }
  }
  return best;
}
