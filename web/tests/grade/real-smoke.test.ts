// Vertical slice on real data: a position near USF gets a grade, depth bands and an official-map fact.
// Skipped when the real files have not been exported yet.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { diskFetch } from "../data/fixture-fetch";

const has = existsSync(join(__dirname, "../../public/data/manifest.json"));

describe.skipIf(!has)("grade on real data", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("grades a University Area address and USF's centre", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SET", "real");
    vi.stubGlobal("fetch", diskFetch());
    vi.resetModules();
    const { gradeFor } = await import("@/lib/grade");
    // A recorded Milton flood-damage point where the model puts 0.45 m at the building,
    // and USF Marshall Student Center
    const wet: [number, number] = [-82.441134, 28.074075];
    const wetGrade = await gradeFor(wet);
    expect(wetGrade.kind === "ok" && ["C", "D", "F"].includes(wetGrade.letter)).toBe(true);
    for (const position of [wet, [-82.4139, 28.0639] as [number, number]]) {
      const grade = await gradeFor(position);
      expect(grade.kind).toBe("ok");
      if (grade.kind === "ok") {
        expect(["A", "B", "C", "D", "F"]).toContain(grade.letter);
        expect(Object.keys(grade.depthByStorm)).toHaveLength(5);
        expect(grade.officialMapSays.length).toBeGreaterThan(0);
        console.log(position, grade.letter, grade.depthByStorm, grade.officialMapSays, "|", grade.weFound, grade.reasons.map((r) => r.text));
      }
    }
  }, 60_000);
});
