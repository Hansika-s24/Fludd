// Server only. The public position of a report: the midpoint of the nearest road segment, so the map never
// shows where a resident stood. A segment is the straight line between its two junctions in graph.bin.
import type { RoadGraph } from "@/lib/routing/graph";
import type { LngLat } from "@/lib/types";
import { loadGraphFromDisk } from "./data";

export function segmentMidpoint(graph: RoadGraph, segment: number): LngLat {
  const a = graph.segmentFrom[segment];
  const b = graph.segmentTo[segment];
  return [(graph.nodeLng[a] + graph.nodeLng[b]) / 2, (graph.nodeLat[a] + graph.nodeLat[b]) / 2];
}

/** Nearest segment midpoint (flat-earth distance, fine at city scale). Checks every segment. */
export function nearestSegmentMidpoint(graph: RoadGraph, position: LngLat): LngLat {
  if (graph.segmentCount === 0) throw new Error("the road graph has no segments");
  const [lng, lat] = position;
  const lngScale = Math.cos((lat * Math.PI) / 180);
  let best: LngLat = segmentMidpoint(graph, 0);
  let bestDistance = Infinity;
  for (let s = 0; s < graph.segmentCount; s++) {
    const mid = segmentMidpoint(graph, s);
    const dx = (mid[0] - lng) * lngScale;
    const dy = mid[1] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestDistance) {
      bestDistance = d;
      best = mid;
    }
  }
  return best;
}

/** Public position for a report, from the road graph on disk. */
export async function snapToRoad(position: LngLat): Promise<LngLat> {
  return nearestSegmentMidpoint(await loadGraphFromDisk(), position);
}
