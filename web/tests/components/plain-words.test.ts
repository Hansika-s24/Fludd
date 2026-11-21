import { describe, expect, it } from "vitest";
import { mapVerdictTitle, plainStorms } from "@/components/report-card/plain-words";
import type { Grade } from "@/lib/types";

const dry: Grade["depthByStorm"] = { "10yr": "none", "25yr": "none", "100yr": "none", "500yr": "none", milton: "none" };

describe("plainStorms", () => {
  it("replaces return periods with the storm's plain name", () => {
    expect(plainStorms("No water reaches the building even in a 500-year storm")).toBe("No water reaches the building even in worst-case rain");
    expect(plainStorms("Water reaches 6 to 12 in at the building in a 25-year storm")).toBe("Water reaches 6 to 12 in at the building in a big storm");
    expect(plainStorms("B: dry at the building in a 25-year storm, 6 in or more in a 100-year storm")).toBe(
      "B: dry at the building in a big storm, 6 in or more in hurricane-level rain",
    );
    expect(plainStorms("F: water of 6 in or more reaches the building in a 10-year storm")).toBe("F: water of 6 in or more reaches the building in heavy summer rain");
  });

  it("leaves other text alone", () => {
    expect(plainStorms("Water reaches 1 to 2 ft at the building in a Milton storm")).toBe("Water reaches 1 to 2 ft at the building in a Milton storm");
    expect(plainStorms("a 30-year mortgage")).toBe("a 30-year mortgage");
  });
});

describe("mapVerdictTitle", () => {
  it("claims the map misses something only when it does", () => {
    expect(mapVerdictTitle({ officialMapSays: "Zone X, minimal flood hazard", depthByStorm: { ...dry, "100yr": "6_12in" } })).toBe("What the flood map doesn't tell you");
  });

  it("says so when the two agree", () => {
    expect(mapVerdictTitle({ officialMapSays: "Zone X, minimal flood hazard", depthByStorm: dry })).toBe("Our model agrees with the flood map");
    expect(mapVerdictTitle({ officialMapSays: "Zone X, minimal flood hazard", depthByStorm: { ...dry, "500yr": "under_6in" } })).toBe("Our model agrees with the flood map");
    expect(mapVerdictTitle({ officialMapSays: "Zone AE, high-risk flood area (1% annual chance)", depthByStorm: { ...dry, "25yr": "1_2ft" } })).toBe(
      "Our model agrees with the flood map",
    );
  });

  it("stays neutral otherwise, and never plays down a high-risk zone", () => {
    expect(mapVerdictTitle({ officialMapSays: "Zone AE, high-risk flood area (1% annual chance)", depthByStorm: dry })).toBe("The flood map and our model");
    expect(mapVerdictTitle({ officialMapSays: "Not on the FEMA flood map", depthByStorm: dry })).toBe("The flood map and our model");
  });
});
