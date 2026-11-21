// The grade: one test per row of the table (PLAN.md section 6), per notch, per cap, then the toy fixture end to end.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDataCache, loadLayer } from "@/lib/data";
import { evidenceAt, gradeFor, gradeFromFacts, type GradeFacts } from "@/lib/grade";
import type { Grade, LngLat } from "@/lib/types";
import { diskFetch } from "../data/fixture-fetch";

type Peaks = { "10yr": number; "25yr": number; "100yr": number; "500yr": number };
function facts(on: Partial<Peaks> = {}, more: Partial<GradeFacts> = {}): GradeFacts {
  const peakOn = { "10yr": 0, "25yr": 0, "100yr": 0, "500yr": 0, milton: 0, ...on };
  return {
    peakOn,
    peakOff: { "10yr": peakOn["10yr"], "25yr": peakOn["25yr"], "100yr": peakOn["100yr"], "500yr": peakOn["500yr"] },
    femaProps: { FLD_ZONE: "X", ZONE_SUBTY: "AREA OF MINIMAL FLOOD HAZARD", SFHA_TF: "F" },
    miltonDamageWithin100m: false,
    cutOffFromEveryFireStation: null,
    ...more,
  };
}
const kinds = (g: Grade, k: "base" | "notch" | "cap") => g.reasons.filter((r) => r.kind === k);

describe("base grade, one row each", () => {
  it("A: dry even in the 500-year storm", () => {
    const g = gradeFromFacts(facts({ "500yr": 0.14 }));
    expect(g.letter).toBe("A");
    expect(g.range).toEqual(["A", "A"]);
    expect(g.lowConfidence).toBe(false);
    expect(g.action).toBeNull();
    expect(kinds(g, "base")).toHaveLength(1);
  });
  it("B: dry at 100-year, wet at 500-year", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.1, "500yr": 0.15 }));
    expect(g.letter).toBe("B");
    expect(g.action).toBeNull();
  });
  it("C: dry at 25-year, wet at 100-year (0.15 m counts as wet)", () => {
    const g = gradeFromFacts(facts({ "25yr": 0.149, "100yr": 0.15, "500yr": 0.2 }));
    expect(g.letter).toBe("C");
    expect(g.action).not.toBeNull();
  });
  it("D: dry at 10-year, wet at 25-year", () => {
    expect(gradeFromFacts(facts({ "25yr": 0.2, "100yr": 0.25, "500yr": 0.29 })).letter).toBe("D");
  });
  it("F: wet at 10-year", () => {
    expect(gradeFromFacts(facts({ "10yr": 0.2, "25yr": 0.25, "100yr": 0.28, "500yr": 0.29 })).letter).toBe("F");
  });
});

describe("notches", () => {
  it("pump: wet with the pump off but dry with it on drops one letter", () => {
    const f = facts({ "25yr": 0.1 });
    f.peakOff["25yr"] = 0.2;
    const g = gradeFromFacts(f);
    expect(g.letter).toBe("B");
    expect(kinds(g, "notch")).toHaveLength(1);
    expect(kinds(g, "notch")[0].text).toMatch(/pump/i);
  });
  it("floor: more than 0.3 m at the building in the 100-year storm drops one letter", () => {
    const g = gradeFromFacts(facts({ "100yr": 0.31, "500yr": 0.5 }));
    expect(g.letter).toBe("D");
    expect(kinds(g, "notch")[0].text).toMatch(/floor/i);
  });
  it("floor: exactly 0.3 m does not notch", () => {
    expect(gradeFromFacts(facts({ "100yr": 0.3, "500yr": 0.5 })).letter).toBe("C");
  });
  it("fire-station hook: no notch while routing is not built (null)", () => {
    expect(kinds(gradeFromFacts(facts({}, { cutOffFromEveryFireStation: null })), "notch")).toHaveLength(0);
  });
  it("fire-station hook: notches when routing reports the address cut off", () => {
    const g = gradeFromFacts(facts({}, { cutOffFromEveryFireStation: true }));
    expect(g.letter).toBe("B");
    expect(kinds(g, "notch")[0].text).toMatch(/fire station/i);
  });
  it("at most two notches apply", () => {
    const f = facts({ "100yr": 0.35, "500yr": 0.5 }, { cutOffFromEveryFireStation: true });
    f.peakOff["25yr"] = 0.2;
    const g = gradeFromFacts(f);
    expect(kinds(g, "notch")).toHaveLength(2);
    expect(g.letter).toBe("F"); // C, then D, then F
  });
  it("notches stop at F", () => {
    const g = gradeFromFacts(facts({ "10yr": 0.2, "25yr": 0.3, "100yr": 0.4, "500yr": 0.5 }));
    expect(g.letter).toBe("F");
  });
});

describe("caps", () => {
  it("Milton flood damage within 100 m: no better than C", () => {
    const g = gradeFromFacts(facts({}, { miltonDamageWithin100m: true }));
    expect(g.letter).toBe("C");
    expect(kinds(g, "cap")[0].text).toMatch(/Milton/);
  });
  it("FEMA high-risk zone (FLD_ZONE A...): no better than C", () => {
    const g = gradeFromFacts(facts({}, { femaProps: { FLD_ZONE: "AE", SFHA_TF: "T" } }));
    expect(g.letter).toBe("C");
    expect(kinds(g, "cap")[0].text).toMatch(/FEMA/);
    expect(g.officialMapSays).toBe("Zone AE, high-risk flood area (1% annual chance)");
  });
  it("FEMA high-risk zone (FLD_ZONE V...): no better than C", () => {
    expect(gradeFromFacts(facts({}, { femaProps: { FLD_ZONE: "VE" } })).letter).toBe("C");
  });
  it("FEMA high-risk zone (SFHA_TF = T): no better than C", () => {
    expect(gradeFromFacts(facts({}, { femaProps: { FLD_ZONE: "", SFHA_TF: "T" } })).letter).toBe("C");
  });
  it("shaded zone X (0.2 PCT): no better than B", () => {
    const g = gradeFromFacts(facts({}, {
      femaProps: { FLD_ZONE: "X", ZONE_SUBTY: "0.2 PCT ANNUAL CHANCE FLOOD HAZARD", SFHA_TF: "F" },
    }));
    expect(g.letter).toBe("B");
    expect(g.officialMapSays).toBe("Shaded Zone X, moderate flood hazard (0.2% annual chance)");
  });
  it("a cap never raises a grade and is only listed when it lowers it", () => {
    const g = gradeFromFacts(facts({ "10yr": 0.2, "25yr": 0.3, "100yr": 0.3, "500yr": 0.3 }, {
      femaProps: { FLD_ZONE: "AE" }, miltonDamageWithin100m: true,
    }));
    expect(g.letter).toBe("F");
    expect(kinds(g, "cap")).toHaveLength(0);
  });
  it("caps apply after notches", () => {
    const f = facts({ "25yr": 0.1 }, { femaProps: { FLD_ZONE: "AE" } });
    f.peakOff["25yr"] = 0.2;
    const g = gradeFromFacts(f);
    expect(g.letter).toBe("C");
    expect(g.reasons.map((r) => r.kind)).toEqual(["base", "notch", "cap"]);
  });
});

describe("card facts", () => {
  it("bands depth per storm, Milton included", () => {
    const g = gradeFromFacts(facts({ "10yr": 0, "25yr": 0.1, "100yr": 0.15, "500yr": 0.61 }, {
      peakOn: { "10yr": 0, "25yr": 0.1, "100yr": 0.15, "500yr": 0.61, milton: 0.3 },
    }));
    expect(g.depthByStorm).toEqual({ "10yr": "none", "25yr": "under_6in", "100yr": "6_12in", "500yr": "over_2ft", milton: "1_2ft" });
  });
  it("says where water first reaches the building", () => {
    expect(gradeFromFacts(facts({ "25yr": 0.2, "100yr": 0.4, "500yr": 0.7 })).weFound)
      .toBe("Water reaches 6 to 12 in at the building in a 25-year storm");
  });
  it("says when water stays away", () => {
    expect(gradeFromFacts(facts()).weFound).toBe("No water reaches the building even in a 500-year storm");
    expect(gradeFromFacts(facts({ "500yr": 0.1 })).weFound).toBe("Water stays under 6 in at the building even in a 500-year storm");
  });
  it("official map: zone X and no zone", () => {
    expect(gradeFromFacts(facts()).officialMapSays).toBe("Zone X, minimal flood hazard");
    expect(gradeFromFacts(facts({}, { femaProps: null })).officialMapSays).toBe("Not on the FEMA flood map");
  });
  it("C, D and F carry a plain action that never calls a flooded road safe", () => {
    for (const on of [{ "100yr": 0.2 }, { "25yr": 0.2 }, { "10yr": 0.2 }]) {
      const g = gradeFromFacts(facts(on));
      expect(g.action).toBeTruthy();
      expect(g.action).not.toMatch(/!/);
      expect(g.action).not.toMatch(/safe to (drive|cross)/i);
    }
  });
});

// ---------- toy fixture ----------

const toyCell = (c: number, r: number): LngLat => [-82.42 + ((c + 0.5) / 48) * 0.012, 28.064 - ((r + 0.5) / 36) * 0.009];

describe("on the toy fixture", () => {
  beforeEach(() => {
    clearDataCache();
    vi.stubGlobal("fetch", diskFetch());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("finds evidence: Milton points within 100 m and the FEMA zone", async () => {
    const [fema, milton] = await Promise.all([loadLayer("fema-zones"), loadLayer("milton-damage")]);
    // A Milton point sits at cell (13,18), one 25 m cell from (14,18).
    expect(evidenceAt(toyCell(14, 18), fema, milton).miltonDamageWithin100m).toBe(true);
    expect(evidenceAt(toyCell(1, 1), fema, milton).miltonDamageWithin100m).toBe(false);
    expect(evidenceAt(toyCell(34, 18), fema, milton).femaProps).toEqual({ zone: "AE" });
    expect(evidenceAt(toyCell(1, 1), fema, milton).femaProps).toEqual({ zone: "X" });
    expect(evidenceAt(toyCell(46, 1), fema, milton).femaProps).toBeNull();
  });

  it("outside the grid is outside", async () => {
    expect(await gradeFor([-82.5, 28.1])).toEqual({ kind: "outside" });
  });

  it("the dry north-west corner is an A in zone X", async () => {
    const g = await gradeFor(toyCell(1, 1));
    expect(g.kind).toBe("ok");
    if (g.kind !== "ok") return;
    expect(g.letter).toBe("A");
    expect(g.officialMapSays).toBe("Zone X, minimal flood hazard");
    expect(g.depthByStorm["500yr"]).toBe("none");
  });

  it("the bottom of bowl 2 is an F in zone AE", async () => {
    const g = await gradeFor(toyCell(34, 18));
    expect(g.kind).toBe("ok");
    if (g.kind !== "ok") return;
    expect(g.letter).toBe("F");
    expect(g.officialMapSays).toBe("Zone AE, high-risk flood area (1% annual chance)");
    expect(g.depthByStorm["10yr"]).toBe("over_2ft");
  });
});
