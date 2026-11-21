// Road snapping and the calibration-baseline depth, read from the toy fixture on disk.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { clearDataCache, loadGold, loadLevels, peakBuildingDepth } from "@/lib/data";
import {
  clearServerDataCache, insideBox, loadGraphFromDisk, loadManifestFromDisk, miltonPeakDepthM,
} from "@/lib/reports/data";
import { nearestSegmentMidpoint, segmentMidpoint, snapToRoad } from "@/lib/reports/snap";
import type { RoadGraph } from "@/lib/routing/graph";
import type { LngLat } from "@/lib/types";
import { diskFetch } from "../data/fixture-fetch";

let graph: RoadGraph;
beforeAll(async () => {
  clearServerDataCache();
  graph = await loadGraphFromDisk();
});

describe("snap to the nearest road segment midpoint (toy graph)", () => {
  it("reads the toy graph from disk", async () => {
    const manifest = await loadManifestFromDisk();
    expect(manifest.version).toBe("toy-1");
    expect(graph.segmentCount).toBeGreaterThan(0);
  });

  it("maps every segment midpoint to itself", () => {
    for (let s = 0; s < graph.segmentCount; s++) {
      const mid = segmentMidpoint(graph, s);
      expect(nearestSegmentMidpoint(graph, mid)).toEqual(mid);
    }
  });

  it("always answers a segment midpoint, the closest one, never the input", async () => {
    const bbox = (await loadManifestFromDisk()).bbox;
    const mids = Array.from({ length: graph.segmentCount }, (_, s) => segmentMidpoint(graph, s));
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 10; j++) {
        const p: LngLat = [bbox[0] + ((bbox[2] - bbox[0]) * i) / 10, bbox[1] + ((bbox[3] - bbox[1]) * j) / 10];
        const snapped = await snapToRoad(p);
        expect(mids).toContainEqual(snapped);
        const scale = Math.cos((p[1] * Math.PI) / 180);
        const dist = (m: LngLat) => Math.hypot((m[0] - p[0]) * scale, m[1] - p[1]);
        expect(dist(snapped)).toBeCloseTo(Math.min(...mids.map(dist)), 12);
      }
    }
  });
});

describe("insideBox", () => {
  it("accepts the edges and refuses outside points", () => {
    const box: [number, number, number, number] = [0, 0, 1, 1];
    expect(insideBox(box, [0, 0])).toBe(true);
    expect(insideBox(box, [1, 1])).toBe(true);
    expect(insideBox(box, [1.0001, 0.5])).toBe(false);
    expect(insideBox(box, [0.5, -0.1])).toBe(false);
  });
});

describe("miltonPeakDepthM (calibration baseline)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearDataCache();
  });

  it("equals the browser helpers' Milton pump-off peak building depth at the same point", async () => {
    vi.stubGlobal("fetch", diskFetch());
    const gold = await loadGold();
    const levels = await loadLevels("milton", "off");
    const [w, s, e, n] = gold.manifest.bbox;
    for (const p of [[(w + e) / 2, (s + n) / 2], [w + (e - w) * 0.25, s + (n - s) * 0.7], [e, s]] as LngLat[]) {
      const expected = peakBuildingDepth(gold, levels, p);
      expect(expected.kind).toBe("ok");
      if (expected.kind === "ok") expect(await miltonPeakDepthM(p)).toBeCloseTo(expected.depthM, 9);
    }
  });

  it("is null off the grid", async () => {
    expect(await miltonPeakDepthM([0, 0])).toBeNull();
  });
});

describe("data-folder switch", () => {
  const realGraph = join(__dirname, "../../public/data/graph.bin");
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.skipIf(!existsSync(realGraph))("reads the real graph from web/public/data when NEXT_PUBLIC_DATA_SET=real", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SET", "real");
    vi.resetModules();
    const data = await import("@/lib/reports/data");
    const snap = await import("@/lib/reports/snap");
    data.clearServerDataCache();
    const layout = JSON.parse(readFileSync(join(__dirname, "../../public/data/graph.json"), "utf8")) as { edgeCount: number };
    const g = await data.loadGraphFromDisk();
    expect(g.segmentCount).toBe(layout.edgeCount);
    const bbox = (await data.loadManifestFromDisk()).bbox;
    const p: LngLat = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
    const snapped = await snap.snapToRoad(p);
    const mids = Array.from({ length: g.segmentCount }, (_, s) => snap.segmentMidpoint(g, s));
    expect(mids).toContainEqual(snapped);
  });
});
