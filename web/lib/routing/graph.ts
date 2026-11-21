// The road graph in CSR ("compressed sparse row") form: flat typed arrays, no object per road.
// decodeGraph turns graph.bin + graph.json into these arrays; nearestNode snaps a position to a junction.
//
// CSR in one sentence: the roads leaving junction u are links firstLink[u] .. firstLink[u+1]-1,
// and link k goes to junction linkTarget[k] along road segment linkSegment[k].
// graph.json has no one-way information, so every segment is usable in both directions.
import type { LngLat, VehicleClass } from "@/lib/types";

export interface RoadGraph {
  nodeCount: number;
  segmentCount: number;
  nodeLng: Float32Array;
  nodeLat: Float32Array;
  firstLink: Int32Array;
  linkTarget: Int32Array;
  linkSegment: Int32Array;
  segmentFrom: Uint32Array;
  segmentTo: Uint32Array;
  segmentLengthM: Float32Array;
  /** Speed limit of the segment's road class, metres per second */
  segmentSpeedMps: Float32Array;
}

/** graph.json: where each array sits inside graph.bin. */
export interface GraphLayout {
  nodeCount: number;
  edgeCount: number;
  /** speed class number -> description containing the speed, e.g. "residential 25 mph" */
  speedClasses: Record<string, string>;
  arrays: { name: string; type: "float32" | "uint32" | "uint8"; offset: number; length: number }[];
}

const MPH_TO_MPS = 0.44704;
const KMH_TO_MPS = 1 / 3.6;
/** Typical adult walking pace. An assumption, not from our data. */
export const WALKING_SPEED_MPS = 1.4;

/** Reads "25 mph" or "40 km/h" out of a speed class description. */
function parseSpeedMps(description: string): number {
  const match = /(\d+(?:\.\d+)?)\s*(mph|km\/h)/i.exec(description);
  if (!match) throw new Error(`graph.json: speed class "${description}" has no "<n> mph" or "<n> km/h"`);
  return Number(match[1]) * (match[2].toLowerCase() === "mph" ? MPH_TO_MPS : KMH_TO_MPS);
}

export function decodeGraph(layout: GraphLayout, bin: ArrayBuffer): RoadGraph {
  const read = <T>(name: string, make: (buffer: ArrayBuffer) => T, bytesEach: number): T => {
    const entry = layout.arrays.find((a) => a.name === name);
    if (!entry) throw new Error(`graph.json: missing array "${name}"`);
    const end = entry.offset + entry.length * bytesEach;
    if (end > bin.byteLength) throw new Error(`graph.bin: array "${name}" runs past the end of the file`);
    // slice copies the bytes, so arrays at unaligned offsets still work
    return make(bin.slice(entry.offset, end));
  };
  const nodeLng = read("nodeLng", (b) => new Float32Array(b), 4);
  const nodeLat = read("nodeLat", (b) => new Float32Array(b), 4);
  const segmentFrom = read("edgeFrom", (b) => new Uint32Array(b), 4);
  const segmentTo = read("edgeTo", (b) => new Uint32Array(b), 4);
  const segmentLengthM = read("edgeLengthM", (b) => new Float32Array(b), 4);
  const speedClass = read("edgeSpeedClass", (b) => new Uint8Array(b), 1);

  const nodeCount = layout.nodeCount;
  const segmentCount = layout.edgeCount;

  const segmentSpeedMps = new Float32Array(segmentCount);
  for (let s = 0; s < segmentCount; s++) {
    const description = layout.speedClasses[String(speedClass[s])];
    if (description === undefined) throw new Error(`graph.json: unknown speed class ${speedClass[s]}`);
    segmentSpeedMps[s] = parseSpeedMps(description);
  }

  // Count links per junction, then lay them out side by side (each segment gives two links).
  const firstLink = new Int32Array(nodeCount + 1);
  for (let s = 0; s < segmentCount; s++) {
    firstLink[segmentFrom[s] + 1]++;
    firstLink[segmentTo[s] + 1]++;
  }
  for (let u = 0; u < nodeCount; u++) firstLink[u + 1] += firstLink[u];
  const linkTarget = new Int32Array(2 * segmentCount);
  const linkSegment = new Int32Array(2 * segmentCount);
  const nextFree = firstLink.slice(0, nodeCount);
  for (let s = 0; s < segmentCount; s++) {
    const a = segmentFrom[s];
    const b = segmentTo[s];
    linkTarget[nextFree[a]] = b;
    linkSegment[nextFree[a]++] = s;
    linkTarget[nextFree[b]] = a;
    linkSegment[nextFree[b]++] = s;
  }

  return {
    nodeCount, segmentCount, nodeLng, nodeLat, firstLink, linkTarget, linkSegment,
    segmentFrom, segmentTo, segmentLengthM, segmentSpeedMps,
  };
}

/** Closest junction to a position (flat-earth distance, fine at city scale). Checks every node. */
export function nearestNode(graph: RoadGraph, position: LngLat): number {
  const [lng, lat] = position;
  const lngScale = Math.cos((lat * Math.PI) / 180);
  let best = -1;
  let bestDistance = Infinity;
  for (let u = 0; u < graph.nodeCount; u++) {
    const dx = (graph.nodeLng[u] - lng) * lngScale;
    const dy = graph.nodeLat[u] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestDistance) {
      bestDistance = d;
      best = u;
    }
  }
  return best;
}

/** Hours to drive (or walk) a whole segment at its speed limit. */
export function travelHours(graph: RoadGraph, segment: number, vehicle: VehicleClass): number {
  const speed = vehicle === "foot" ? WALKING_SPEED_MPS : graph.segmentSpeedMps[segment];
  return graph.segmentLengthM[segment] / speed / 3600;
}

export function nodePositionOf(graph: RoadGraph, node: number): LngLat {
  return [graph.nodeLng[node], graph.nodeLat[node]];
}
