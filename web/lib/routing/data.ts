// Reads the routing inputs (graph, segments, levels, manifest box, fire stations) from the data folder.
// Kept inside lib/routing on purpose: lib/data is owned and rewritten separately.
// Browser and worker read over HTTP from DATA_BASE; tests swap in a disk reader with setDataReader.
import { DATA_BASE } from "@/lib/config";
import type { Levels, LngLat, Manifest, PumpState, Scenario } from "@/lib/types";
import { decodeGraph, type GraphLayout, type RoadGraph } from "./graph";

/** segments.json: per road segment, the bowls it crosses and its lowest ground inside each. */
export interface SegmentBowls {
  id: number;
  bowls: { bowl: number; lowestGroundM: number }[];
}

export interface DataReader {
  readJson(path: string): Promise<unknown>;
  readBytes(path: string): Promise<ArrayBuffer>;
}

const httpReader: DataReader = {
  async readJson(path) {
    const res = await fetch(`${DATA_BASE}/${path}`);
    if (!res.ok) throw new Error(`Data file ${path} failed to load (${res.status})`);
    return (await res.json()) as unknown;
  },
  async readBytes(path) {
    const res = await fetch(`${DATA_BASE}/${path}`);
    if (!res.ok) throw new Error(`Data file ${path} failed to load (${res.status})`);
    return res.arrayBuffer();
  },
};

let reader: DataReader = httpReader;
const cache = new Map<string, Promise<unknown>>();

/** Swap where files come from (tests use the disk). Clears everything already loaded. */
export function setDataReader(next: DataReader): void {
  reader = next;
  cache.clear();
}

/** Loads each thing once and hands back the same promise afterwards. */
export function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    cache.set(key, hit);
    hit.catch(() => cache.delete(key)); // a failed load can be retried
  }
  return hit;
}

export function loadRoadGraph(): Promise<RoadGraph> {
  return remember("graph", async () => {
    const [layout, bin] = await Promise.all([reader.readJson("graph.json"), reader.readBytes("graph.bin")]);
    return decodeGraph(layout as GraphLayout, bin);
  });
}

/** Segments indexed by id, checked against the graph. */
export function loadSegments(): Promise<SegmentBowls[]> {
  return remember("segments", async () => {
    const [list, graph] = await Promise.all([reader.readJson("segments.json") as Promise<SegmentBowls[]>, loadRoadGraph()]);
    if (list.length !== graph.segmentCount) {
      throw new Error(`segments.json has ${list.length} segments, graph has ${graph.segmentCount}`);
    }
    const byId: SegmentBowls[] = new Array<SegmentBowls>(list.length);
    for (const s of list) {
      if (!Number.isInteger(s.id) || s.id < 0 || s.id >= list.length) throw new Error(`segments.json: bad segment id ${s.id}`);
      byId[s.id] = s;
    }
    return byId;
  });
}

export function loadScenarioLevels(scenario: Scenario, pump: PumpState): Promise<Levels> {
  return remember(`levels/${scenario}/${pump}`, async () => (await reader.readJson(`levels/${scenario}-pump-${pump}.json`)) as Levels);
}

/** [west, south, east, north]: positions outside this box get "outside". */
export function loadStudyBox(): Promise<Manifest["bbox"]> {
  return remember("bbox", async () => ((await reader.readJson("manifest.json")) as Manifest).bbox);
}

/** Positions of the points in layers/fire-stations.geojson. */
export function loadFireStations(): Promise<LngLat[]> {
  return remember("fire-stations", async () => {
    const layer = (await reader.readJson("layers/fire-stations.geojson")) as GeoJSON.FeatureCollection;
    const out: LngLat[] = [];
    for (const f of layer.features) {
      if (f.geometry.type === "Point") out.push([f.geometry.coordinates[0], f.geometry.coordinates[1]]);
    }
    return out;
  });
}
