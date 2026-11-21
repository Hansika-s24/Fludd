import { describe, expect, it } from "vitest";
import { inventedNumbers, isUnsafe, numbersIn } from "@/lib/gemini/guards";

describe("numbersIn", () => {
  it("finds digits in text, ignoring thousands commas", () => {
    expect(numbersIn("Water 0.24 m deep in a 100-year storm, 1,200 homes")).toEqual([0.24, 100, 1200]);
  });
  it("reads numbers out of nested input, including ones inside strings", () => {
    const found = numbersIn({ a: 0.5, b: ["6_12in", "Zone AE"], c: { d: "100yr", e: true, f: null } });
    expect(found.sort((x, y) => x - y)).toEqual([0.5, 6, 12, 100]);
  });
});

describe("inventedNumbers", () => {
  const input = { depth: 0.24, band: "6_12in", storm: "100yr", time: "2 PM" };
  it("accepts output whose numbers all come from the input", () => {
    expect(inventedNumbers("About 0.24 m, 6 to 12 in, in a 100-year storm by 2 PM.", input)).toEqual([]);
  });
  it("treats 0.240 and 0.24 as the same number", () => {
    expect(inventedNumbers("0.240 m", input)).toEqual([]);
  });
  it("flags numbers that are not in the input", () => {
    expect(inventedNumbers("Raise the floor 3 feet, about 9 inches above 0.24 m.", input)).toEqual([3, 9]);
  });
  it("flags unit conversions, since they are new numbers", () => {
    expect(inventedNumbers("That is about 24 cm.", input)).toEqual([24]);
  });
});

describe("isUnsafe", () => {
  it.each([
    "The road is safe to drive.",
    "Flooded roads are safe to drive through slowly.",
    "You can drive through the water on Fowler Avenue.",
    "It is fine to drive through shallow flood water.",
    "Most cars can cross the flooded road.",
    "The street is passable by car.",
  ])("rejects %s", (text) => {
    expect(isUnsafe(text)).toBe(true);
  });

  it.each([
    "Never drive through flood water.",
    "Do not drive through the water on Fowler Avenue.",
    "It is not safe to drive once the street floods.",
    "Move your car to the garage before noon.",
    "Turn around, don't drown.",
  ])("accepts %s", (text) => {
    expect(isUnsafe(text)).toBe(false);
  });
});
