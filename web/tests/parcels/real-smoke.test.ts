// findBetterOptions on the real parcels.json. Skipped when the real file has not been exported.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { diskFetch } from "../data/fixture-fetch";

const has = existsSync(join(__dirname, "../../public/data/parcels.json"));

describe.skipIf(!has)("better options on real data", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("finds better homes near a flooded University Area address", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SET", "real");
    vi.stubGlobal("fetch", diskFetch());
    vi.resetModules();
    const { findBetterOptions } = await import("@/lib/parcels");
    const { gradeFor } = await import("@/lib/grade");
    const position: [number, number] = [-82.441134, 28.074075];
    const t0 = performance.now();
    const options = await findBetterOptions(position);
    const cold = performance.now() - t0;
    const t1 = performance.now();
    await findBetterOptions(position);
    const warm = performance.now() - t1;
    const grade = await gradeFor(position);
    expect(grade.kind).toBe("ok");
    expect(options.length).toBeLessThanOrEqual(10);
    for (const o of options) {
      expect(o.distanceM).toBeLessThanOrEqual(1600);
      expect(Number.isInteger(o.distanceM)).toBe(true);
    }
    console.log("grade here:", grade.kind === "ok" ? [grade.letter, grade.range, grade.lowConfidence] : grade,
      `| ${options.length} options | cold ${cold.toFixed(0)} ms, warm ${warm.toFixed(0)} ms`);
    console.log(JSON.stringify(options.slice(0, 3), null, 1));
  }, 120_000);
});
