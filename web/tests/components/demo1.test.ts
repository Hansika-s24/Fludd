// Demo 1: the rules that set simulated resident reports against the model. No model numbers are fixed here
// except the ones each test passes in.
import { describe, expect, it } from "vitest";
import {
  BAND_RANGE_M,
  DEMO_CENTRE,
  DEMO_REPORTS,
  IMPASSABLE_M,
  bandMiddleM,
  compare,
  impassableReports,
  isImpassable,
  markFor,
  modelWords,
  readingWords,
  reportLine,
  summarise,
  summarySentence,
} from "@/components/demo/demo1-data";
import { distanceM } from "@/lib/grade";
import type { DepthBand } from "@/lib/types";

const row = (band: DepthBand, modelM: number | null) => ({ band, modelM });

describe("the band-middle rule", () => {
  it("reads a band as the middle of its two ends", () => {
    expect(bandMiddleM("none")).toBe(0);
    expect(bandMiddleM("under_6in")).toBeCloseTo(0.075, 6);
    expect(bandMiddleM("6_12in")).toBeCloseTo(0.225, 6);
    expect(bandMiddleM("1_2ft")).toBeCloseTo(0.455, 6);
  });

  it("reads the open top band as 2 to 4 ft", () => {
    expect(BAND_RANGE_M.over_2ft).toEqual([0.61, 1.22]);
    expect(bandMiddleM("over_2ft")).toBeCloseTo(0.915, 6);
  });
});

describe("compare", () => {
  it("agrees when the model's depth falls in the reported band", () => {
    expect(compare("6_12in", 0.2)?.verdict).toBe("agrees");
    expect(compare("none", 0)?.verdict).toBe("agrees");
  });

  it("says deeper when the resident's band is above the model's, with the gap from the band middle", () => {
    const c = compare("1_2ft", 0.2);
    expect(c?.verdict).toBe("deeper");
    expect(c?.diffM).toBeCloseTo(0.255, 6);
  });

  it("says shallower when the resident's band is below the model's", () => {
    const c = compare("6_12in", 0.7);
    expect(c?.verdict).toBe("shallower");
    expect(c?.diffM).toBeCloseTo(-0.475, 6);
  });

  it("counts water reported where the model has none as deeper", () => {
    expect(compare("under_6in", 0)?.verdict).toBe("deeper");
  });

  it("gives nothing when there is no model value", () => {
    expect(compare("1_2ft", null)).toBeNull();
    expect(compare("1_2ft", Number.NaN)).toBeNull();
  });
});

describe("summarise", () => {
  it("counts each verdict over the reports with water and averages the gaps", () => {
    const s = summarise([
      row("6_12in", 0.1), // deeper by 0.125
      row("1_2ft", 0.2), // deeper by 0.255
      row("1_2ft", 0.4), // agrees
      row("6_12in", 0.7), // shallower by 0.475
      row("none", 0), // left out
    ]);
    expect(s).toMatchObject({ withWater: 4, compared: 4, deeper: 2, shallower: 1, agree: 1 });
    expect(s.deeperByM).toBeCloseTo((0.125 + 0.255) / 2, 6);
    expect(s.shallowerByM).toBeCloseTo(0.475, 6);
    expect(summarySentence(s)).toBe("2 of 4 reports with water are deeper than the model, by about 7 in.");
  });

  it("leads with shallower when more reports are shallower", () => {
    const s = summarise([row("under_6in", 0.4), row("6_12in", 0.7), row("1_2ft", 0.2)]);
    expect(s).toMatchObject({ deeper: 1, shallower: 2 });
    // gaps: 0.325 and 0.475, mean 0.4 m = 16 in
    expect(summarySentence(s)).toBe("2 of 3 reports with water are shallower than the model, by about 16 in.");
  });

  it("uses the singular for one report", () => {
    const s = summarise([row("1_2ft", 0.2), row("6_12in", 0.2), row("6_12in", 0.25)]);
    expect(summarySentence(s)).toBe("1 of 3 reports with water is deeper than the model, by about 10 in.");
  });

  it("says so when every report agrees", () => {
    const s = summarise([row("6_12in", 0.2), row("1_2ft", 0.5), row("none", 0)]);
    expect(s).toMatchObject({ withWater: 2, compared: 2, agree: 2, deeper: 0, shallower: 0, deeperByM: 0, shallowerByM: 0 });
    expect(summarySentence(s)).toBe("All 2 reports with water agree with the model.");
    expect(summarySentence(summarise([row("6_12in", 0.2)]))).toBe("The 1 report with water agrees with the model.");
  });

  it("says so when no report found water", () => {
    const s = summarise([row("none", 0), row("none", 0.3)]);
    expect(s).toMatchObject({ withWater: 0, compared: 0 });
    expect(summarySentence(s)).toBe("No report here found standing water.");
    expect(summarySentence(summarise([]))).toBe("No report here found standing water.");
  });

  it("gives no number when the model has no value (the toy data set)", () => {
    const s = summarise([row("6_12in", null), row("1_2ft", null)]);
    expect(s).toMatchObject({ withWater: 2, compared: 0 });
    expect(summarySentence(s)).toBe("Model value unavailable in this build.");
  });

  it("compares only the reports that have a model value", () => {
    const s = summarise([row("1_2ft", 0.2), row("1_2ft", null)]);
    expect(s).toMatchObject({ withWater: 2, compared: 1, deeper: 1 });
    expect(summarySentence(s)).toBe("1 of 1 report with water is deeper than the model, by about 10 in.");
  });
});

describe("the impassable rule", () => {
  it("is 0.30 m", () => {
    expect(IMPASSABLE_M).toBe(0.3);
  });

  it("flags a reading whose band middle is at or over 0.30 m", () => {
    expect(isImpassable("none")).toBe(false);
    expect(isImpassable("under_6in")).toBe(false);
    expect(isImpassable("6_12in")).toBe(false);
    expect(isImpassable("1_2ft")).toBe(true);
    expect(isImpassable("over_2ft")).toBe(true);
  });

  it("lists the fixture's impassable reports", () => {
    const ids = impassableReports(DEMO_REPORTS).map((r) => r.id);
    expect(ids).toEqual(DEMO_REPORTS.filter((r) => r.band === "1_2ft" || r.band === "over_2ft").map((r) => r.id));
    expect(ids.length).toBeGreaterThan(0);
  });
});

describe("the fixture", () => {
  it("has five or six reports within 250 m of the crossing, one of them with no standing water", () => {
    expect(DEMO_REPORTS.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_REPORTS.length).toBeLessThanOrEqual(6);
    for (const r of DEMO_REPORTS) expect(distanceM(DEMO_CENTRE, r.position)).toBeLessThanOrEqual(250);
    expect(DEMO_REPORTS.filter((r) => r.band === "none")).toHaveLength(1);
  });

  it("shows initials only", () => {
    for (const r of DEMO_REPORTS) expect(r.initials).toMatch(/^[A-Z]\.[A-Z]\.$/);
  });

  it("has unique ids, so the map keeps each ring", () => {
    expect(new Set(DEMO_REPORTS.map((r) => r.id)).size).toBe(DEMO_REPORTS.length);
  });
});

describe("wording", () => {
  it("writes a report as initials, minutes ago, band and reference object", () => {
    expect(reportLine({ id: "x", initials: "A.B.", minutesAgo: 10, position: [0, 0], band: "6_12in", reference: "tyre" })).toBe(
      "A.B. · 10 min ago · 6 to 12 in at the tyre",
    );
    expect(readingWords({ band: "none", reference: null })).toBe("no standing water");
    expect(readingWords({ band: "under_6in", reference: "kerb" })).toBe("under 6 in at the kerb");
  });

  it("writes the model's depth in inches", () => {
    expect(modelWords(0)).toBe("no water");
    expect(modelWords(0.005)).toBe("under 1 in");
    expect(modelWords(0.2286)).toBe("about 9 in");
  });

  it("draws a wider ring for deeper water", () => {
    const sizes = (["none", "under_6in", "6_12in", "1_2ft", "over_2ft"] as const).map(
      (band) => markFor({ id: "x", initials: "A.B.", minutesAgo: 1, position: [0, 0], band, reference: null }).size,
    );
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(new Set(sizes).size).toBe(sizes.length);
  });
});
