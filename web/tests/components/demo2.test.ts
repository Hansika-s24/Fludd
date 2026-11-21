import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADDRESSES, distanceWords, letterTone, midpoint, money, usableGrades, weakerIndex } from "@/components/demo/demo2-data";
import type { Grade, GradeResult, Manifest } from "@/lib/types";

const manifest = JSON.parse(readFileSync(join(__dirname, "../../public/data/manifest.json"), "utf8")) as Manifest;

const grade = (letter: Grade["letter"]): Grade => ({
  kind: "ok",
  letter,
  range: [letter, letter],
  lowConfidence: false,
  reasons: [],
  depthByStorm: { "10yr": "none", "25yr": "none", "100yr": "none", "500yr": "none", milton: "none" },
  officialMapSays: "Zone X, minimal flood hazard",
  weFound: "",
  action: null,
});

describe("demo 2 addresses", () => {
  it("are two different spots inside the study box", () => {
    const [west, south, east, north] = manifest.bbox;
    for (const a of ADDRESSES) {
      expect(a.position[0]).toBeGreaterThan(west);
      expect(a.position[0]).toBeLessThan(east);
      expect(a.position[1]).toBeGreaterThan(south);
      expect(a.position[1]).toBeLessThan(north);
    }
    expect(ADDRESSES[0].position).not.toEqual(ADDRESSES[1].position);
    expect(new Set(ADDRESSES.map((a) => a.id)).size).toBe(2);
  });

  it("carry a street address and a short caption taken from it", () => {
    for (const a of ADDRESSES) {
      expect(a.label).toMatch(/^\d+ \S/);
      expect(a.label.startsWith(a.short)).toBe(true);
      expect(a.short.length).toBeLessThanOrEqual(6);
    }
  });
});

describe("demo 2 helpers", () => {
  it("finds the midpoint the camera uses to show both homes", () => {
    expect(midpoint([-82.44, 28.07], [-82.42, 28.09])).toEqual([-82.43, 28.08]);
    const mid = midpoint(ADDRESSES[0].position, ADDRESSES[1].position);
    expect(mid[0]).toBeGreaterThan(Math.min(ADDRESSES[0].position[0], ADDRESSES[1].position[0]));
    expect(mid[0]).toBeLessThan(Math.max(ADDRESSES[0].position[0], ADDRESSES[1].position[0]));
  });

  it("picks the address with the worse letter, and the second on a tie", () => {
    expect(weakerIndex(["A", "F"])).toBe(1);
    expect(weakerIndex(["D", "B"])).toBe(0);
    expect(weakerIndex(["F", "D"])).toBe(0);
    expect(weakerIndex(["C", "C"])).toBe(1);
  });

  it("only hands back grades when both spots were graded", () => {
    const outside: GradeResult = { kind: "outside" };
    expect(usableGrades([grade("A"), grade("F")])?.map((g) => g.letter)).toEqual(["A", "F"]);
    expect(usableGrades([grade("A"), outside])).toBeNull();
    expect(usableGrades([outside, outside])).toBeNull();
    expect(usableGrades([grade("A")])).toBeNull();
  });

  it("gives each letter its meaning colour", () => {
    expect(letterTone("A")).toEqual(letterTone("B"));
    expect(letterTone("A").text).toBe("text-safe");
    expect(letterTone("C")).toEqual({ text: "text-warn", color: "var(--color-warn)" });
    expect(letterTone("D")).toEqual(letterTone("F"));
    expect(letterTone("F").text).toBe("text-late");
  });

  it("writes money in whole dollars and distance the way people say it", () => {
    expect(money(281309)).toBe("$281,309");
    expect(money(199999.6)).toBe("$200,000");
    expect(distanceWords(100)).toBe("328 ft");
    expect(distanceWords(265)).toBe("0.2 mi");
    expect(distanceWords(1600)).toBe("1.0 mi");
  });
});
