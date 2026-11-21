// The toy fixture must match the gold-file contract (docs/contracts.md), so both sides can build on it.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAYER_NAMES, SCENARIOS, type Bowl, type Levels, type Manifest, type Validation } from "@/lib/types";

const dir = join(__dirname, "../../public/data/toy");
const json = <T>(p: string): T => JSON.parse(readFileSync(join(dir, p), "utf8")) as T;

function pngSize(p: string): { width: number; height: number } {
  const b = readFileSync(join(dir, p));
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe("toy fixture", () => {
  const manifest = json<Manifest>("manifest.json");
  const bowls = json<Bowl[]>("bowls.json");

  it("has a manifest with a grid, hour zero and every scenario", () => {
    expect(manifest.bbox[0]).toBeLessThan(manifest.bbox[2]);
    expect(manifest.bbox[1]).toBeLessThan(manifest.bbox[3]);
    expect(manifest.groundRange.min).toBeLessThan(manifest.groundRange.max);
    expect(Number.isNaN(Date.parse(manifest.hourZero))).toBe(false);
    expect([...manifest.scenarios].sort()).toEqual([...SCENARIOS].sort());
  });

  it("has ground and bowl images on the manifest grid", () => {
    const { width, height } = manifest.grid;
    expect(pngSize("ground.png")).toEqual({ width, height });
    expect(pngSize("bowls.png")).toEqual({ width, height });
  });

  it("has two bowls, one spilling into the other, and one pump", () => {
    expect(bowls).toHaveLength(2);
    expect(bowls.filter((b) => b.spillsTo !== null)).toHaveLength(1);
    expect(bowls.filter((b) => b.pump)).toHaveLength(1);
    for (const b of bowls) expect(b.spillHeightM).toBeGreaterThan(b.lowestPoint.heightM);
  });

  it("has levels for every scenario and pump state, every bowl, every hour", () => {
    for (const scenario of SCENARIOS) {
      for (const pump of ["on", "off"] as const) {
        const l = json<Levels>(`levels/${scenario}-pump-${pump}.json`);
        expect(l.scenario).toBe(scenario);
        expect(l.pump).toBe(pump);
        for (const b of bowls) {
          const series = l.levels[String(b.id)];
          expect(series).toHaveLength(manifest.hours);
          for (const h of series) expect(h).toBeGreaterThanOrEqual(b.lowestPoint.heightM);
        }
      }
    }
  });

  it("has a road graph whose binary matches its layout", () => {
    const g = json<{ nodeCount: number; edgeCount: number; arrays: { name: string; type: string; offset: number; length: number }[] }>("graph.json");
    const bin = readFileSync(join(dir, "graph.bin"));
    const bytes = { float32: 4, uint32: 4, uint8: 1 } as Record<string, number>;
    const end = Math.max(...g.arrays.map((a) => a.offset + a.length * bytes[a.type]));
    expect(bin.byteLength).toBe(end);
    expect(g.edgeCount).toBe(12);
    const segments = json<{ id: number; bowls: { bowl: number; lowestGroundM: number }[] }[]>("segments.json");
    expect(segments).toHaveLength(g.edgeCount);
  });

  it("has every map layer and the validation figures", () => {
    for (const name of LAYER_NAMES) expect(existsSync(join(dir, `layers/${name}.geojson`))).toBe(true);
    const v = json<Validation>("validation.json");
    expect(v.hits).toBeLessThanOrEqual(v.total);
  });
});
