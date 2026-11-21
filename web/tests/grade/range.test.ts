// Grade range from the low/high rainfall variants (PLAN.md section 6), and the pure letter function.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDataCache, loadLevelsVariant } from "@/lib/data";
import { gradeFor, gradeFromFacts, letterFromDepths, type GradeFacts, type LetterInput, type Storm } from "@/lib/grade";
import type { LngLat } from "@/lib/types";
import { diskFetch } from "../data/fixture-fetch";

type Peaks = Record<Storm, number>;
const dry: Peaks = { "10yr": 0, "25yr": 0, "100yr": 0, "500yr": 0 };
const peaks = (p: Partial<Peaks> = {}): Peaks => ({ ...dry, ...p });

function facts(on: Partial<Peaks>, variants: GradeFacts["rainVariants"], more: Partial<GradeFacts> = {}): GradeFacts {
  const p = peaks(on);
  return {
    peakOn: { ...p, milton: 0 },
    peakOff: { ...p },
    femaProps: { FLD_ZONE: "X" },
    miltonDamageWithin100m: false,
    cutOffFromEveryFireStation: null,
    rainVariants: variants,
    ...more,
  };
}

describe("letterFromDepths", () => {
  const input = (more: Partial<LetterInput> = {}): LetterInput => ({
    peakOn: peaks(), peakOff: null, femaHighRisk: false, femaShadedX: false,
    miltonDamageWithin100m: false, cutOffFromEveryFireStation: null, ...more,
  });
  it("gives the base letter from pump-on depths", () => {
    expect(letterFromDepths(input()).letter).toBe("A");
    expect(letterFromDepths(input({ peakOn: peaks({ "500yr": 0.15 }) })).letter).toBe("B");
    expect(letterFromDepths(input({ peakOn: peaks({ "100yr": 0.2, "500yr": 0.2 }) })).letter).toBe("C");
    expect(letterFromDepths(input({ peakOn: peaks({ "25yr": 0.2 }) })).letter).toBe("D");
    expect(letterFromDepths(input({ peakOn: peaks({ "10yr": 0.2 }) })).letter).toBe("F");
  });
  it("skips the pump notch when peakOff is null and applies it when given", () => {
    const on = peaks({ "500yr": 0.1 });
    expect(letterFromDepths(input({ peakOn: on, peakOff: null })).letter).toBe("A");
    expect(letterFromDepths(input({ peakOn: on, peakOff: peaks({ "500yr": 0.2 }) })).letter).toBe("B");
  });
  it("applies the flag caps", () => {
    expect(letterFromDepths(input({ femaHighRisk: true })).letter).toBe("C");
    expect(letterFromDepths(input({ femaShadedX: true })).letter).toBe("B");
    expect(letterFromDepths(input({ miltonDamageWithin100m: true })).letter).toBe("C");
    expect(letterFromDepths(input({ femaHighRisk: true })).reasons.at(-1)?.text).toMatch(/SFHA/);
  });
  it("agrees with gradeFromFacts", () => {
    const f = facts({ "100yr": 0.35, "500yr": 0.5 }, null, { femaProps: { FLD_ZONE: "AE" } });
    const g = gradeFromFacts(f);
    const l = letterFromDepths({ ...f, peakOn: peaks({ "100yr": 0.35, "500yr": 0.5 }), femaHighRisk: true, femaShadedX: false, femaZone: "AE" });
    expect(l.letter).toBe(g.letter);
    expect(l.reasons).toEqual(g.reasons);
  });
});

describe("grade range", () => {
  it("is [letter, letter] and not low confidence without variants", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.2, "500yr": 0.2 }, null));
    expect(g.range).toEqual(["C", "C"]);
    expect(g.lowConfidence).toBe(false);
    const h = gradeFromFacts(facts({ "100yr": 0.2, "500yr": 0.2 }, undefined));
    expect(h.range).toEqual(["C", "C"]);
  });
  it("best from low rain, worst from high rain", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.2, "500yr": 0.2 }, {
      low: peaks({ "500yr": 0.2 }), high: peaks({ "25yr": 0.2, "100yr": 0.25, "500yr": 0.29 }),
    }));
    expect(g.letter).toBe("C");
    expect(g.range).toEqual(["B", "D"]);
    expect(g.lowConfidence).toBe(true); // B, C, D: three letters
  });
  it("two letters is not low confidence", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.2, "500yr": 0.2 }, {
      low: peaks({ "500yr": 0.2 }), high: peaks({ "100yr": 0.2, "500yr": 0.2 }),
    }));
    expect(g.range).toEqual(["B", "C"]);
    expect(g.lowConfidence).toBe(false);
  });
  it("applies the central grade's notches to both ends", () => {
    // Central: base C, pump notch (25yr wet only with the pump off) -> D. Low: base B -> C. High: base D -> F.
    const f = facts({ "100yr": 0.2, "500yr": 0.2 }, {
      low: peaks({ "500yr": 0.2 }), high: peaks({ "25yr": 0.2 }),
    });
    f.peakOff["25yr"] = 0.2;
    const g = gradeFromFacts(f);
    expect(g.letter).toBe("D");
    expect(g.range).toEqual(["C", "F"]);
    expect(g.lowConfidence).toBe(true);
  });
  it("applies the caps to both ends", () => {
    const g = gradeFromFacts(facts({ "500yr": 0.2 }, { low: peaks(), high: peaks({ "100yr": 0.2 }) }, {
      femaProps: { FLD_ZONE: "AE" },
    }));
    expect(g.letter).toBe("C");
    expect(g.range).toEqual(["C", "C"]);
    expect(g.lowConfidence).toBe(false);
  });
  it("always contains the central letter", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.2 }, { low: peaks({ "25yr": 0.2 }), high: peaks() }));
    expect(g.range).toEqual(["C", "C"]);
  });
});

// ---------- the variant loader and gradeFor ----------

const toyCell = (c: number, r: number): LngLat => [-82.42 + ((c + 0.5) / 48) * 0.012, 28.064 - ((r + 0.5) / 36) * 0.009];
const toyLevels = join(__dirname, "../../public/data/toy/levels");

/** Serves the toy fixture plus hand-made variant files: low = the 10-year levels, high = the 500-year levels. */
function withVariants(): (u: string | URL | Request) => Promise<Response> {
  const inner = diskFetch();
  return async (u) => {
    const url = String(u);
    const m = url.match(/levels\/(10yr|25yr|100yr|500yr)-(low|high)-pump-on\.json$/);
    if (!m) return inner(url);
    const source = m[2] === "low" ? "10yr" : "500yr";
    const l = JSON.parse(readFileSync(join(toyLevels, `${source}-pump-on.json`), "utf8")) as { scenario: string };
    l.scenario = m[1];
    return new Response(JSON.stringify(l));
  };
}

describe("rain variants on the toy fixture", () => {
  beforeEach(() => {
    clearDataCache();
    vi.stubGlobal("fetch", diskFetch());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loadLevelsVariant resolves null when the file is missing", async () => {
    expect(await loadLevelsVariant("100yr", "low")).toBeNull();
  });

  it("loadLevelsVariant rejects on other failures", async () => {
    vi.stubGlobal("fetch", async (u: string) =>
      u.includes("-low-pump-on") ? new Response("boom", { status: 500 }) : diskFetch()(u));
    await expect(loadLevelsVariant("100yr", "low")).rejects.toThrow(/100yr-low-pump-on\.json.*500/);
  });

  it("loadLevelsVariant loads and checks a variant file", async () => {
    vi.stubGlobal("fetch", withVariants());
    const l = await loadLevelsVariant("25yr", "high");
    expect(l?.scenario).toBe("25yr");
    expect(l?.pump).toBe("on");
  });

  it("gradeFor keeps [letter, letter] on the toy fixture (no variants)", async () => {
    const g = await gradeFor(toyCell(1, 1));
    expect(g.kind === "ok" && g.range).toEqual(["A", "A"]);
    expect(g.kind === "ok" && g.lowConfidence).toBe(false);
  });

  it("gradeFor uses the variants when they exist", async () => {
    vi.stubGlobal("fetch", withVariants());
    const central = await gradeFor(toyCell(1, 1));
    expect(central.kind).toBe("ok");
    // Find a toy cell whose central letter differs from the 500-year-everywhere letter, to see the range move.
    let moved = false;
    for (let c = 0; c < 48 && !moved; c += 2) {
      const g = await gradeFor(toyCell(c, 18));
      if (g.kind !== "ok") continue;
      expect(["A", "B", "C", "D", "F"].indexOf(g.range[0])).toBeLessThanOrEqual(["A", "B", "C", "D", "F"].indexOf(g.letter));
      expect(["A", "B", "C", "D", "F"].indexOf(g.range[1])).toBeGreaterThanOrEqual(["A", "B", "C", "D", "F"].indexOf(g.letter));
      if (g.range[0] !== g.range[1]) moved = true;
    }
    expect(moved).toBe(true);
  });
});
