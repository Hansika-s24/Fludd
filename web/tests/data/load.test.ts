// Loaders read the toy fixture through the data-folder switch and check each file against the contract.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDataCache, loadGold, loadLayer, loadLevels, loadValidation } from "@/lib/data";
import { validateBowls, validateLayer, validateLevels, validateManifest } from "@/lib/data/validate";
import type { Bowl, Manifest } from "@/lib/types";
import { diskFetch } from "./fixture-fetch";

const toy = join(__dirname, "../../public/data/toy");
const json = (p: string): unknown => JSON.parse(readFileSync(join(toy, p), "utf8"));

beforeEach(() => {
  clearDataCache();
  vi.stubGlobal("fetch", diskFetch());
});
afterEach(() => vi.unstubAllGlobals());

describe("loadGold on the toy fixture", () => {
  it("decodes the ground and bowl grids on the manifest grid", async () => {
    const gold = await loadGold();
    const { width, height } = gold.manifest.grid;
    expect(gold.groundM).toHaveLength(width * height);
    expect(gold.bowlIds).toHaveLength(width * height);
    expect(gold.bowls.map((b) => b.id)).toEqual([1, 2]);
    expect(gold.textures).toEqual({ ground: "/data/toy/ground.png", bowls: "/data/toy/bowls.png" });
  });

  it("puts each bowl's lowest point in that bowl at its recorded height", async () => {
    const gold = await loadGold();
    const { width } = gold.manifest.grid;
    // Bowl 1's lowest point is the centre of column 14, row 18; bowl 2's is column 34, row 18.
    for (const [id, col] of [[1, 14], [2, 34]] as const) {
      const i = 18 * width + col;
      expect(gold.bowlIds[i]).toBe(id);
      const bowl = gold.bowls.find((b) => b.id === id) as Bowl;
      // bowls.json rounds heights to 0.01 m; the PNG keeps 6 m / 65535 resolution.
      expect(Math.abs(gold.groundM[i] - bowl.lowestPoint.heightM)).toBeLessThanOrEqual(0.0051);
    }
  });

  it("reads bowl id 0 (drains away) in the far corner", async () => {
    const gold = await loadGold();
    expect(gold.bowlIds[0]).toBe(0);
  });
});

describe("other loaders", () => {
  it("loads levels for a scenario and pump state", async () => {
    const l = await loadLevels("25yr", "off");
    expect(l.scenario).toBe("25yr");
    expect(l.pump).toBe("off");
    expect(l.levels["2"]).toHaveLength(25);
  });

  it("loads a layer and the validation figures", async () => {
    const fema = await loadLayer("fema-zones");
    expect(fema.type).toBe("FeatureCollection");
    expect(fema.features).toHaveLength(2);
    const v = await loadValidation();
    expect(v.hits).toBe(4);
    expect(v.total).toBe(5);
  });

  it("names the file when one is missing", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
    await expect(loadValidation()).rejects.toThrow(/validation\.json.*404/);
  });

  it("rejects levels whose series length is not manifest.hours", async () => {
    const broken = json("levels/10yr-pump-on.json") as { levels: Record<string, number[]> };
    broken.levels["1"] = broken.levels["1"].slice(0, 3);
    const inner = diskFetch();
    vi.stubGlobal("fetch", async (u: string) =>
      u.endsWith("10yr-pump-on.json") ? new Response(JSON.stringify(broken)) : inner(u));
    await expect(loadLevels("10yr", "on")).rejects.toThrow(/levels\/10yr-pump-on\.json.*levels\.1.*25/);
  });

  it("rejects a bowls.png whose size is not the manifest grid", async () => {
    const m = json("manifest.json") as Manifest;
    m.grid.width = 47;
    const inner = diskFetch();
    vi.stubGlobal("fetch", async (u: string) =>
      u.endsWith("manifest.json") ? new Response(JSON.stringify(m)) : inner(u));
    await expect(loadGold()).rejects.toThrow(/ground\.png.*48 x 36.*47 x 36/);
  });
});

describe("validators name the file and the field", () => {
  it("manifest: missing grid width", () => {
    const m = json("manifest.json") as { grid: Record<string, unknown> };
    delete m.grid.width;
    expect(() => validateManifest(m, "manifest.json")).toThrow(/manifest\.json.*grid\.width/);
  });

  it("manifest: unknown scenario", () => {
    const m = json("manifest.json") as { scenarios: string[] };
    m.scenarios.push("1000yr");
    expect(() => validateManifest(m, "manifest.json")).toThrow(/manifest\.json.*scenarios\.5/);
  });

  it("manifest: bbox west not less than east", () => {
    const m = json("manifest.json") as { bbox: number[] };
    m.bbox[0] = m.bbox[2];
    expect(() => validateManifest(m, "manifest.json")).toThrow(/manifest\.json.*bbox/);
  });

  it("bowls: bowl id 0 is reserved", () => {
    const b = json("bowls.json") as { id: number }[];
    b[0].id = 0;
    expect(() => validateBowls(b, "bowls.json")).toThrow(/bowls\.json.*0\.id/);
  });

  it("levels: pump must be on or off", () => {
    const l = json("levels/10yr-pump-on.json") as { pump: string };
    l.pump = "maybe";
    expect(() => validateLevels(l, "levels/10yr-pump-on.json")).toThrow(/levels\/10yr-pump-on\.json.*pump/);
  });

  it("layer: must be a FeatureCollection", () => {
    expect(() => validateLayer({ type: "Feature" }, "layers/ponds.geojson")).toThrow(/layers\/ponds\.geojson.*type/);
  });
});
