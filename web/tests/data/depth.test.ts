// Depth at a cell and at a building, checked on a hand-built grid and on the toy fixture.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildingDepth, cellIndex, clearDataCache, depthAt, depthAtBuilding, depthAtCell, peakBuildingDepth,
} from "@/lib/data";
import type { GoldData, Levels, LngLat, Manifest } from "@/lib/types";
import { diskFetch } from "./fixture-fetch";

// ---------- hand-built 7 x 7 grid over a 0.007 x 0.007 degree box ----------

function manifest7(): Manifest {
  return {
    version: "t", bbox: [0, 0, 0.007, 0.007], grid: { width: 7, height: 7, cellSizeM: 100 },
    groundRange: { min: 0, max: 20 }, hourZero: "2026-11-21T08:00:00-05:00", hours: 2,
    scenarios: ["10yr"], units: "m", sources: [],
  };
}
/** Ground 10 everywhere, bowl 1 everywhere, except the listed [col, row] cells at ground 9. */
function gold7(lowCells: [number, number][] = [], bowl = 1): GoldData {
  const groundM = new Float32Array(49).fill(10);
  const bowlIds = new Uint16Array(49).fill(bowl);
  for (const [c, r] of lowCells) groundM[r * 7 + c] = 9;
  return { manifest: manifest7(), groundM, bowlIds, bowls: [], textures: { ground: "", bowls: "" } };
}
const levels7: Levels = { scenario: "10yr", pump: "on", levels: { "1": [10, 10.5] } };
/** Centre of cell [col, row]; row 0 is the north row. */
const at = (c: number, r: number): LngLat => [(c + 0.5) * 0.001, 0.007 - (r + 0.5) * 0.001];

describe("cellIndex", () => {
  it("maps positions to row-major cells, north row first", () => {
    const m = manifest7();
    expect(cellIndex(m, at(0, 0))).toBe(0);
    expect(cellIndex(m, at(6, 0))).toBe(6);
    expect(cellIndex(m, at(0, 6))).toBe(42);
    expect(cellIndex(m, at(3, 2))).toBe(17);
  });
  it("includes the bbox edges and returns null off the grid", () => {
    const m = manifest7();
    expect(cellIndex(m, [0.007, 0])).toBe(48);
    expect(cellIndex(m, [0, 0.007])).toBe(0);
    expect(cellIndex(m, [-0.0001, 0.003])).toBeNull();
    expect(cellIndex(m, [0.003, 0.0071])).toBeNull();
  });
});

describe("depthAtCell", () => {
  it("is level minus ground", () => {
    const g = gold7([[2, 2]]);
    expect(depthAtCell(g, levels7, 2 * 7 + 2, 0)).toBe(1);
    expect(depthAtCell(g, levels7, 2 * 7 + 2, 1)).toBe(1.5);
    expect(depthAtCell(g, levels7, 0, 1)).toBe(0.5);
  });
  it("is never below zero", () => {
    const low: Levels = { scenario: "10yr", pump: "on", levels: { "1": [8, 8] } };
    expect(depthAtCell(gold7(), low, 0, 0)).toBe(0);
  });
  it("is zero where bowl id is 0 (drains away)", () => {
    expect(depthAtCell(gold7([[0, 0]], 0), levels7, 0, 1)).toBe(0);
  });
  it("rejects an hour outside the levels series", () => {
    expect(() => depthAtCell(gold7(), levels7, 0, 2)).toThrow(RangeError);
    expect(() => depthAtCell(gold7(), levels7, 0, 0.5)).toThrow(RangeError);
  });
});

describe("buildingDepth (90th percentile within 3 cells)", () => {
  // The disk of radius 3 cells around (3,3) holds 29 cells; nearest-rank 90th percentile is the 27th smallest.
  const edge: [number, number][] = [[3, 0], [3, 6], [0, 3]];
  it("is 1 m when 3 of the 29 cells hold 1 m", () => {
    expect(buildingDepth(gold7(edge), levels7, at(3, 3), 0)).toEqual({ kind: "ok", depthM: 1 });
  });
  it("is 0 m when only 2 of the 29 cells hold 1 m", () => {
    expect(buildingDepth(gold7(edge.slice(0, 2)), levels7, at(3, 3), 0)).toEqual({ kind: "ok", depthM: 0 });
  });
  it("ignores cells outside the radius (the corners)", () => {
    expect(buildingDepth(gold7([[0, 0], [6, 6], [0, 6], [6, 0]]), levels7, at(3, 3), 0)).toEqual({ kind: "ok", depthM: 0 });
  });
  it("uses only on-grid cells near the edge", () => {
    // Around (0,0) the disk keeps 11 cells; nearest-rank 90th is the 10th smallest, so 2 wet cells are enough.
    expect(buildingDepth(gold7([[1, 0], [0, 1]]), levels7, at(0, 0), 0)).toEqual({ kind: "ok", depthM: 1 });
    expect(buildingDepth(gold7([[1, 0]]), levels7, at(0, 0), 0)).toEqual({ kind: "ok", depthM: 0 });
  });
  it("is outside off the grid", () => {
    expect(buildingDepth(gold7(), levels7, [1, 1], 0)).toEqual({ kind: "outside" });
  });
  it("peakBuildingDepth takes the highest hour", () => {
    expect(peakBuildingDepth(gold7(edge), levels7, at(3, 3))).toEqual({ kind: "ok", depthM: 1.5 });
  });
});

// ---------- toy fixture ----------

const toyCell = (c: number, r: number): LngLat => [-82.42 + ((c + 0.5) / 48) * 0.012, 28.064 - ((r + 0.5) / 36) * 0.009];

describe("depthAt on the toy fixture", () => {
  beforeEach(() => {
    clearDataCache();
    vi.stubGlobal("fetch", diskFetch());
  });
  afterEach(() => vi.unstubAllGlobals());

  const near = (r: Awaited<ReturnType<typeof depthAt>>, want: number) => {
    expect(r.kind).toBe("ok");
    // ground.png keeps 6 m / 65535 resolution and bowls.json rounds to 0.01 m.
    if (r.kind === "ok") expect(Math.abs(r.depthM - want)).toBeLessThanOrEqual(0.0051);
  };

  it("bowl 1 lowest point (10.35 m): 10yr pump on, hour 0 level 10.35 -> about 0 m; hour 11 level 12 -> about 1.65 m", async () => {
    near(await depthAt(toyCell(14, 18), "10yr", "on", 0), 0);
    near(await depthAt(toyCell(14, 18), "10yr", "on", 11), 1.65);
  });

  it("bowl 2 lowest point (9.36 m): 10yr pump on, hour 14 level 10.53 -> about 1.17 m", async () => {
    near(await depthAt(toyCell(34, 18), "10yr", "on", 14), 1.17);
  });

  it("is 0 in the north-west corner, which drains away (bowl 0)", async () => {
    expect(await depthAt(toyCell(0, 0), "500yr", "off", 14)).toEqual({ kind: "ok", depthM: 0 });
  });

  it("is outside off the grid", async () => {
    expect(await depthAt([-82.5, 28.1], "10yr", "on", 0)).toEqual({ kind: "outside" });
  });

  it("depthAtBuilding is outside off the grid and 0 in the dry corner", async () => {
    expect(await depthAtBuilding([-82.5, 28.1], "10yr", "on", 0)).toEqual({ kind: "outside" });
    expect(await depthAtBuilding(toyCell(1, 1), "500yr", "off", 14)).toEqual({ kind: "ok", depthM: 0 });
  });
});
