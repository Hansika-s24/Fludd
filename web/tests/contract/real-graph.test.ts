// The real road graph (pipeline/graph/build.py) must match the toy fixture's format.
// Skipped when the real graph has not been built yet.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "../../public/data");
const has = existsSync(join(dir, "graph.json")) && existsSync(join(dir, "graph.bin")) && existsSync(join(dir, "segments.json"));
const json = <T>(dirPath: string, p: string): T => JSON.parse(readFileSync(join(dirPath, p), "utf8")) as T;

interface Layout {
  nodeCount: number;
  edgeCount: number;
  speedClasses: Record<string, string>;
  arrays: { name: string; type: "float32" | "uint32" | "uint8"; offset: number; length: number }[];
}
interface Segment {
  id: number;
  bowls: { bowl: number; lowestGroundM: number }[];
}
const BYTES: Record<Layout["arrays"][number]["type"], number> = { float32: 4, uint32: 4, uint8: 1 };

describe.skipIf(!has)("real road graph", () => {
  const layout = has ? json<Layout>(dir, "graph.json") : null;
  const toy = json<Layout>(join(dir, "toy"), "graph.json");

  it("uses the toy layout: same arrays, types and speed classes", () => {
    if (!layout) return;
    expect(layout.arrays.map((a) => [a.name, a.type])).toEqual(toy.arrays.map((a) => [a.name, a.type]));
    expect(layout.speedClasses).toEqual(toy.speedClasses);
  });

  it("has a binary whose length matches the layout", () => {
    if (!layout) return;
    const bin = readFileSync(join(dir, "graph.bin"));
    const end = Math.max(...layout.arrays.map((a) => a.offset + a.length * BYTES[a.type]));
    expect(bin.byteLength).toBe(end);
    for (const a of layout.arrays) {
      expect(a.length).toBe(a.name.startsWith("node") ? layout.nodeCount : layout.edgeCount);
    }
  });

  it("has one segments.json entry per edge, each bowl in bowls.json", () => {
    if (!layout) return;
    const segments = json<Segment[]>(dir, "segments.json");
    expect(segments).toHaveLength(layout.edgeCount);
    expect(segments.map((s) => s.id)).toEqual(segments.map((_, i) => i));
    const bowlIds = new Set(json<{ id: number }[]>(dir, "bowls.json").map((b) => b.id));
    for (const s of segments) {
      for (const b of s.bowls) {
        expect(bowlIds.has(b.bowl)).toBe(true);
        expect(Number.isFinite(b.lowestGroundM)).toBe(true);
      }
    }
  });
});
