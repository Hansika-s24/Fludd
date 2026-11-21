// Test helper: lets the routing engine read the toy fixture from disk instead of over HTTP.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setDataReader, type DataReader } from "@/lib/routing/data";
import type { LngLat } from "@/lib/types";
import type { RoadGraph } from "@/lib/routing/graph";

const toyDir = join(__dirname, "../../public/data/toy");

export const toyReader: DataReader = {
  async readJson(path) {
    return JSON.parse(readFileSync(join(toyDir, path), "utf8")) as unknown;
  },
  async readBytes(path) {
    return new Uint8Array(readFileSync(join(toyDir, path))).buffer;
  },
};

export function useToyFixture(): void {
  setDataReader(toyReader);
}

/** Position of a graph node, for tests that start or end exactly on a junction. */
export function nodePosition(graph: RoadGraph, node: number): LngLat {
  return [graph.nodeLng[node], graph.nodeLat[node]];
}
