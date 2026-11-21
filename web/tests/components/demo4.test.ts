// Demo 4: the pure rules of the food-share walk (docs/food-share.md). No model numbers are fixed here except
// the ones each test passes in.
import { describe, expect, it } from "vitest";
import {
  ASKER_POSITION,
  CODE_ALPHABET,
  CODE_LENGTH,
  DEMO_GIVERS,
  HIDE_AT_M,
  MILE_M,
  askerMark,
  clampPeople,
  countWords,
  covers,
  distanceWords,
  giverCount,
  giverMarks,
  isHidden,
  matchGivers,
  pickupCode,
  reachM,
  roundPosition,
  type DemoGiver,
} from "@/components/demo/demo4-data";
import { distanceM } from "@/lib/grade";
import type { LngLat } from "@/lib/types";

const HERE: LngLat = [-82.43, 28.05];
/** A point `metres` due north of HERE. */
const north = (metres: number): LngLat => [HERE[0], HERE[1] + metres / 111_194.9];
const giver = (id: string, position: LngLat, reachMiles: 1 | 2 | 3 = 1): DemoGiver => ({
  id, name: `Demo ${id}`, offer: "meals", pickupWindow: "today", reachMiles, position, earlierPeople: 0,
});

describe("distance and reach", () => {
  it("measures metres between two points", () => {
    expect(distanceM(HERE, north(1000))).toBeCloseTo(1000, 0);
  });

  it("turns miles into metres", () => {
    expect(reachM({ reachMiles: 1 })).toBeCloseTo(1609.344, 6);
    expect(reachM({ reachMiles: 3 })).toBeCloseTo(3 * MILE_M, 6);
  });

  it("covers a position inside the radius and not one outside it", () => {
    expect(covers(giver("x", north(1500), 1), HERE)).toBe(true);
    expect(covers(giver("x", north(1700), 1), HERE)).toBe(false);
    expect(covers(giver("x", north(1700), 2), HERE)).toBe(true);
    expect(covers(giver("x", north(4900), 3), HERE)).toBe(false);
  });

  it("writes a distance in miles", () => {
    expect(distanceWords(MILE_M)).toBe("1.0 mi");
    expect(distanceWords(640)).toBe("0.4 mi");
  });
});

describe("the hide rule", () => {
  it("is 0.15 m, stricter than the 0.30 m used for cars", () => {
    expect(HIDE_AT_M).toBe(0.15);
  });

  it("hides at 0.15 m and above, and not just below", () => {
    expect(isHidden(0.15)).toBe(true);
    expect(isHidden(0.1501)).toBe(true);
    expect(isHidden(0.64)).toBe(true);
    expect(isHidden(0.1499)).toBe(false);
    expect(isHidden(0)).toBe(false);
  });

  it("hides nothing when the model has no value", () => {
    expect(isHidden(null)).toBe(false);
    expect(isHidden(Number.NaN)).toBe(false);
  });
});

describe("matchGivers", () => {
  const far = giver("far", north(1200), 1);
  const near = giver("near", north(300), 1);
  const mid = giver("mid", north(700), 1);
  const outOfReach = giver("out", north(2500), 1);

  it("lists the givers in reach, nearest first", () => {
    const got = matchGivers([far, near, outOfReach, mid], [0, 0, 0, 0], HERE);
    expect(got.map((m) => m.giver.id)).toEqual(["near", "mid", "far"]);
    expect(got[0].distanceM).toBeCloseTo(300, 0);
  });

  it("leaves out a giver whose door is under 0.15 m or more of water", () => {
    expect(matchGivers([far, near, mid], [0, 0.15, 0.14], HERE).map((m) => m.giver.id)).toEqual(["mid", "far"]);
  });

  it("hides no one when the model has no values", () => {
    expect(matchGivers([far, near], [null, null], HERE)).toHaveLength(2);
    expect(matchGivers([far, near], [], HERE)).toHaveLength(2);
  });
});

describe("the rounded position", () => {
  it("moves a position by less than the half-diagonal of a 500 m square", () => {
    for (const p of [ASKER_POSITION, HERE, north(123), north(777)]) {
      expect(distanceM(p, roundPosition(p))).toBeLessThanOrEqual(355);
    }
  });

  it("gives two doors in the same square the same position", () => {
    const cell = roundPosition(HERE);
    const neighbour: LngLat = [cell[0] + 0.0005, cell[1] - 0.0005];
    expect(roundPosition(neighbour)).toEqual(roundPosition(cell));
  });
});

describe("what the giver sees", () => {
  it("rounds to the nearest 10 below 100 and shows the count from 100 up", () => {
    expect(giverCount(7)).toBe(10);
    expect(giverCount(44)).toBe(40);
    expect(giverCount(96)).toBe(100);
    expect(giverCount(130)).toBe(130);
    expect(giverCount(45)).toBe(50);
    expect(giverCount(99)).toBe(100);
    expect(giverCount(100)).toBe(100);
    expect(giverCount(3)).toBe(0);
  });

  it("says a count, never a household", () => {
    expect(countWords(44)).toBe("about 40 people nearby asked for meals");
    expect(countWords(130)).toBe("about 130 people nearby asked for meals");
    expect(countWords(3)).toBe("fewer than 10 people nearby asked for meals");
    expect(countWords(0)).toBe("no one nearby has asked yet");
  });

  it("keeps the party size between 1 and 6", () => {
    expect(clampPeople(0)).toBe(1);
    expect(clampPeople(4)).toBe(4);
    expect(clampPeople(9)).toBe(6);
  });
});

describe("the pickup code", () => {
  it("is four characters from the unambiguous alphabet", () => {
    let seed = 0.123;
    const random = () => (seed = (seed * 9301 + 0.49297) % 1);
    for (let i = 0; i < 50; i++) {
      const code = pickupCode(random);
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("follows the random source it is given", () => {
    expect(pickupCode(() => 0)).toBe("AAAA");
    expect(pickupCode(() => 0.999999)).toBe("9999");
    expect(pickupCode(() => 1)).toBe("9999");
  });
});

describe("the fixture", () => {
  it("has three givers with invented names, within about 1 km of the asker", () => {
    expect(DEMO_GIVERS).toHaveLength(3);
    for (const g of DEMO_GIVERS) {
      expect(g.name).toMatch(/^Demo /);
      expect(distanceM(ASKER_POSITION, g.position)).toBeLessThanOrEqual(1100);
      expect([1, 2, 3]).toContain(g.reachMiles);
    }
    expect(new Set(DEMO_GIVERS.map((g) => g.id)).size).toBe(3);
  });

  it("reaches the asker's rounded position from every giver", () => {
    const rounded = roundPosition(ASKER_POSITION);
    for (const g of DEMO_GIVERS) expect(covers(g, rounded)).toBe(true);
  });
});

describe("the map rings", () => {
  it("draws a reach ring under each giver, wider for a wider reach", () => {
    const marks = giverMarks(DEMO_GIVERS);
    expect(marks).toHaveLength(6);
    expect(new Set(marks.map((m) => m.id)).size).toBe(6);
    const reach = marks.filter((m) => m.id.endsWith("-reach")).map((m) => m.size);
    expect([...reach].sort((a, b) => a - b)).toEqual(reach);
  });

  it("turns a hidden giver the warning colour, drops its reach ring and gives it a new id", () => {
    const marks = giverMarks(DEMO_GIVERS, [false, false, true]);
    expect(marks.map((m) => m.id)).toEqual(["a-reach", "a", "b-reach", "b", "c-hidden"]);
    expect(marks[4].color).toBe("var(--color-warn)");
  });

  it("puts the asker on the rounded position, not the door", () => {
    expect(askerMark(ASKER_POSITION).position).toEqual(roundPosition(ASKER_POSITION));
    expect(askerMark(ASKER_POSITION).position).not.toEqual(ASKER_POSITION);
  });
});
