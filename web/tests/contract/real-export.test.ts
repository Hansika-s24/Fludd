// The real pipeline export must pass the same contract checks as the toy fixture.
// Skipped when the real files have not been exported yet.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateBowls, validateLayer, validateLevels, validateManifest } from "@/lib/data/validate";
import { LAYER_NAMES, SCENARIOS } from "@/lib/types";

const dir = join(__dirname, "../../public/data");
const has = existsSync(join(dir, "manifest.json"));
const json = (p: string): unknown => JSON.parse(readFileSync(join(dir, p), "utf8"));

function pngSize(p: string): { width: number; height: number } {
  const b = readFileSync(join(dir, p));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe.skipIf(!has)("real export", () => {
  it("passes the manifest, bowl, level and layer validators", () => {
    const manifest = validateManifest(json("manifest.json"), "manifest.json");
    const bowls = validateBowls(json("bowls.json"), "bowls.json");
    expect(pngSize("ground.png")).toEqual({ width: manifest.grid.width, height: manifest.grid.height });
    expect(pngSize("bowls.png")).toEqual({ width: manifest.grid.width, height: manifest.grid.height });
    expect(bowls.length).toBeGreaterThan(0);
    expect(bowls.length).toBeLessThanOrEqual(65535);
    for (const scenario of SCENARIOS) {
      for (const pump of ["on", "off"] as const) {
        const file = `levels/${scenario}-pump-${pump}.json`;
        const levels = validateLevels(json(file), file, { scenario, pump, hours: manifest.hours, bowlIds: bowls.map((b) => b.id) });
        expect(Object.keys(levels.levels)).toHaveLength(bowls.length);
      }
    }
    for (const name of LAYER_NAMES) {
      const file = `layers/${name}.geojson`;
      expect(validateLayer(json(file), file).features.length).toBeGreaterThan(0);
    }
  });
});
