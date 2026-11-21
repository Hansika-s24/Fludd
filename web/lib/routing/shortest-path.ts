// Plain Dijkstra: cheapest path between two junctions for any per-segment cost (metres, seconds...).
// No flooding here; this is the textbook search the flood-aware ones are built from.
import { MinHeap } from "./heap";
import type { RoadGraph } from "./graph";

export function shortestPath(
  graph: RoadGraph,
  from: number,
  to: number,
  cost: (segment: number) => number,
): { nodes: number[]; cost: number } | null {
  const best = new Float64Array(graph.nodeCount).fill(Infinity);
  const cameFrom = new Int32Array(graph.nodeCount).fill(-1);
  const heap = new MinHeap();
  best[from] = 0;
  heap.push(0, from);

  for (let item = heap.pop(); item; item = heap.pop()) {
    const u = item.id;
    if (item.key > best[u]) continue; // stale entry
    if (u === to) break;
    for (let k = graph.firstLink[u]; k < graph.firstLink[u + 1]; k++) {
      const v = graph.linkTarget[k];
      const candidate = best[u] + cost(graph.linkSegment[k]);
      if (candidate < best[v]) {
        best[v] = candidate;
        cameFrom[v] = u;
        heap.push(candidate, v);
      }
    }
  }

  if (best[to] === Infinity) return null;
  return { nodes: walkBack(cameFrom, to), cost: best[to] };
}

/** Follows cameFrom links back from the end and returns the path start-first. */
export function walkBack(cameFrom: Int32Array, end: number): number[] {
  const nodes = [end];
  for (let u = cameFrom[end]; u !== -1; u = cameFrom[u]) nodes.push(u);
  return nodes.reverse();
}
