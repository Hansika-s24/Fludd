import { describe, expect, it } from "vitest";
import { matchCommunities, resolveCommunity } from "@/components/report-card/communities";
import type { LngLat } from "@/lib/types";

const at: LngLat = [-82.41, 28.06];
const all = ["4050 Lofts", "42 North apartments", "Campus Palms Apartments", "Park Place Apartments", "Park Place Tampa", "The Oaks", "Terrace Palms"].map((name) => ({
  name,
  position: at,
}));
const labels = (text: string) => matchCommunities(text, all).map((s) => s.label);

describe("matchCommunities", () => {
  it("finds a community from the start of its name", () => {
    expect(labels("campus")).toEqual(["Campus Palms Apartments"]);
    expect(labels("42 n")).toEqual(["42 North apartments"]);
  });

  it("ignores filler words, so 'apartments' or 'the' never decides a match", () => {
    expect(labels("campus palms apartments")).toEqual(["Campus Palms Apartments"]);
    expect(labels("oaks apartments")).toEqual(["The Oaks"]);
    expect(labels("apartments")).toEqual([]);
  });

  it("matches a later word, with names that start with the text first", () => {
    expect(labels("palms")).toEqual(["Campus Palms Apartments", "Terrace Palms"]);
    expect(labels("park place")).toEqual(["Park Place Apartments", "Park Place Tampa"]);
  });

  it("returns nothing for a name it does not hold", () => {
    expect(labels("viridian apartments")).toEqual([]);
    expect(labels("a")).toEqual([]);
  });
});

describe("resolveCommunity", () => {
  it("reads the place back from a suggestion id with no request", () => {
    const [s] = matchCommunities("campus", all);
    expect(resolveCommunity(s.id)).toEqual({ label: "Campus Palms Apartments", position: at, inside: true });
  });

  it("leaves other ids alone", () => {
    expect(resolveCommunity("KEY1|4202 E Fowler Ave, Tampa")).toBeNull();
    expect(resolveCommunity("w:KEY|Avalon Heights")).toBeNull();
  });
});
