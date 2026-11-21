import { describe, expect, it } from "vitest";
import {
  AGREE_TOLERANCE_M,
  CAMERA_FRAMES,
  CAR_MOVE_DEPTH_M,
  TREND_TOLERANCE_M,
  bandOf,
  carWords,
  comparisonSentence,
  firstPastCarPoint,
  midDepth,
  pastCarPoint,
  referenceWords,
  trend,
} from "@/components/demo/demo3-data";

describe("trend", () => {
  it("is steady for the first still", () => {
    expect(trend(null, 0.2)).toBe("steady");
  });
  it("is rising or falling past the tolerance", () => {
    expect(trend(0.1, 0.1 + TREND_TOLERANCE_M + 0.001)).toBe("rising");
    expect(trend(0.2, 0.2 - TREND_TOLERANCE_M - 0.001)).toBe("falling");
  });
  it("is steady inside the tolerance, either way", () => {
    expect(trend(0.2, 0.215)).toBe("steady");
    expect(trend(0.2, 0.185)).toBe("steady");
    expect(trend(0.2, 0.2)).toBe("steady");
  });
  it("reads the fixture as steady, then rising three times", () => {
    const mids = CAMERA_FRAMES.map(midDepth);
    expect(mids.map((m, i) => trend(i === 0 ? null : mids[i - 1], m))).toEqual(["steady", "rising", "rising", "rising"]);
  });
});

describe("referenceWords", () => {
  it("names what the water has reached", () => {
    expect(referenceWords(0)).toBe("below the kerb");
    expect(referenceWords(0.05)).toBe("below the kerb");
    expect(referenceWords(0.1)).toBe("at the kerb");
    expect(referenceWords(0.14)).toBe("at the kerb");
    expect(referenceWords(0.2)).toBe("to the tyre rim");
    expect(referenceWords(0.26)).toBe("to the tyre rim");
    expect(referenceWords(0.3)).toBe("over the rim");
    expect(referenceWords(0.9)).toBe("over the rim");
  });
  it("gives each fixture still its own reference", () => {
    expect(CAMERA_FRAMES.map((f) => referenceWords(midDepth(f)))).toEqual([
      "below the kerb", "at the kerb", "to the tyre rim", "over the rim",
    ]);
  });
});

describe("bandOf", () => {
  it("uses the app's four bands", () => {
    expect(bandOf(0.05).label).toBe("under 6 in");
    expect(bandOf(0.2).label).toBe("6 to 12 in");
    expect(bandOf(0.4).label).toBe("1 to 2 ft");
    expect(bandOf(0.7).label).toBe("over 2 ft");
  });
  it("grows the ring with the band and never uses the safe colour", () => {
    const rings = [0.05, 0.2, 0.4, 0.7].map((d) => bandOf(d).ring);
    expect([...rings].sort((a, b) => a - b)).toEqual(rings);
    for (const d of [0.05, 0.2, 0.4, 0.7]) expect(bandOf(d).color).not.toContain("safe");
  });
});

describe("comparisonSentence", () => {
  it("says the model is deeper when it is", () => {
    expect(comparisonSentence("9:05 pm", 0.38, 0.48)).toBe(
      "At 9:05 pm the model has the water about 4 in deeper than the camera read at this kerb.",
    );
  });
  it("says the model is shallower when it is", () => {
    expect(comparisonSentence("9:05 pm", 0.38, 0.2)).toBe(
      "At 9:05 pm the model has the water about 7 in shallower than the camera read at this kerb.",
    );
  });
  it("says they agree inside the tolerance", () => {
    expect(comparisonSentence("9:05 pm", 0.38, 0.38 + AGREE_TOLERANCE_M - 0.005)).toBe(
      "At 9:05 pm the model and the camera agree to within about an inch.",
    );
    expect(comparisonSentence("9:05 pm", 0.38, 0.38 - AGREE_TOLERANCE_M + 0.005)).toContain("agree");
  });
});

describe("the car threshold", () => {
  it("is 0.30 m", () => {
    expect(CAR_MOVE_DEPTH_M).toBe(0.3);
  });
  it("is passed at the threshold and above, not below", () => {
    expect(pastCarPoint(0.29)).toBe(false);
    expect(pastCarPoint(0.3)).toBe(true);
    expect(pastCarPoint(0.5)).toBe(true);
  });
  it("words the consequence, and never calls a shallower depth safe to drive", () => {
    expect(carWords(0.38)).toBe("Past the point where a car should move.");
    expect(carWords(0.1)).toContain("No depth of water is safe to drive through");
  });
  it("finds the first fixture still past the point", () => {
    expect(firstPastCarPoint(CAMERA_FRAMES)?.time).toBe("9:05 pm");
    expect(firstPastCarPoint(CAMERA_FRAMES.slice(0, 3))).toBeNull();
  });
});
