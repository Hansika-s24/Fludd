import { describe, expect, it } from "vitest";
import { addContribution, parseStored, type Contribution } from "@/components/rewards/contributions";
import {
  REACH_CAP,
  REACH_RADIUS_M,
  approvedPlaces,
  countHomes,
  homesFrom,
  impactOf,
  placesOf,
  reachSlots,
  type Home,
} from "@/components/rewards/impact";
import type { LngLat } from "@/lib/types";

/** Metres per degree near Tampa (28 N), close enough to place fixtures a known distance apart. */
const LAT_M = 111_195;
const LNG_M = 111_195 * Math.cos((28.06 * Math.PI) / 180);
const ORIGIN: LngLat = [-82.41, 28.06];
/** A point `east` and `north` metres from ORIGIN. */
const at = (east: number, north: number): LngLat => [ORIGIN[0] + east / LNG_M, ORIGIN[1] + north / LAT_M];
const home = (id: string, east: number, north: number): Home => ({ id, position: at(east, north) });
const now = new Date("2026-11-21T14:00:00");

describe("the radius", () => {
  it("is one street block, 150 m", () => {
    expect(REACH_RADIUS_M).toBe(150);
  });
});

describe("countHomes", () => {
  it("counts homes inside the radius and leaves out the ones beyond it", () => {
    const homes = [home("a", 0, 0), home("b", 100, 0), home("c", 0, 148), home("d", 0, 153), home("e", 400, 400)];
    expect(countHomes([at(0, 0)], homes)).toBe(3);
  });

  it("counts a home once when two contributions both reach it", () => {
    // Two reports 100 m apart: b sits between them and is within 150 m of both.
    const homes = [home("a", -120, 0), home("b", 50, 0), home("c", 220, 0)];
    expect(countHomes([at(0, 0)], homes)).toBe(2); // a, b
    expect(countHomes([at(100, 0)], homes)).toBe(2); // b, c
    expect(countHomes([at(0, 0), at(100, 0)], homes)).toBe(3); // not 4
  });

  it("counts the same place reported twice only once", () => {
    const homes = [home("a", 10, 10), home("b", -30, 40)];
    expect(countHomes([at(0, 0), at(0, 0), at(0, 0)], homes)).toBe(2);
  });

  it("is zero with no contributions", () => {
    expect(countHomes([], [home("a", 0, 0)])).toBe(0);
    expect(countHomes(placesOf([]), [home("a", 0, 0)])).toBe(0);
  });

  it("is zero when no home is near", () => {
    expect(countHomes([at(0, 0)], [home("far", 1000, 1000)])).toBe(0);
    expect(countHomes([at(0, 0)], [])).toBe(0);
  });

  it("takes another radius when asked", () => {
    const homes = [home("a", 0, 60), home("b", 0, 140)];
    expect(countHomes([at(0, 0)], homes, 100)).toBe(1);
  });
});

describe("placesOf", () => {
  it("keeps only contributions that have a place", () => {
    const list: Contribution[] = [
      { kind: "onboarded", at: now.toISOString() },
      { kind: "report", at: now.toISOString(), position: at(0, 0) },
      { kind: "checkin", at: now.toISOString() },
      { kind: "prepared", at: now.toISOString() },
      { kind: "camera", at: now.toISOString(), position: at(300, 0) },
      { kind: "report", at: now.toISOString() }, // saved before places were stored
    ];
    expect(placesOf(list)).toEqual([at(0, 0), at(300, 0)]);
  });

  it("adds no homes for contributions without a place", () => {
    const list: Contribution[] = [
      { kind: "onboarded", at: now.toISOString() },
      { kind: "inlet", at: now.toISOString() },
    ];
    expect(countHomes(placesOf(list), [home("a", 0, 0)])).toBe(0);
  });
});

describe("homesFrom", () => {
  it("leaves out vacant lots and keeps every lived-in parcel", () => {
    const parcels = [
      { folio: "1", position: at(0, 0), propertyType: "SINGLE FAMILY" },
      { folio: "2", position: at(10, 0), propertyType: "VACANT RESIDENT" },
      { folio: "3", position: at(20, 0), propertyType: "MULTI-FAMILY" },
      { folio: "4", position: at(30, 0), propertyType: "MOBILE HOMES" },
    ];
    expect(homesFrom(parcels).map((h) => h.id)).toEqual(["1", "3", "4"]);
  });
});

describe("storing a place with a contribution", () => {
  it("keeps the position it was given", () => {
    const r = addContribution([], "report", now, at(5, 5));
    expect(r.added).toBe(true);
    expect(r.list[0].position).toEqual(at(5, 5));
  });

  it("stores no position when there is none", () => {
    const r = addContribution([], "onboarded", now);
    expect("position" in r.list[0]).toBe(false);
    expect("position" in addContribution([], "report", now, null).list[0]).toBe(false);
  });

  it("reads back saved records, with and without a place", () => {
    const saved: unknown = [
      { kind: "report", at: now.toISOString(), position: [-82.41, 28.06] },
      { kind: "onboarded", at: now.toISOString() },
      { kind: "report", at: now.toISOString(), position: ["x", 28.06] }, // broken place: keep the record, drop the place
      { kind: "report", at: now.toISOString(), position: [-82.41, 128.06] }, // not a latitude
      { kind: "nonsense", at: now.toISOString() },
      "junk",
    ];
    expect(parseStored(saved)).toEqual([
      { kind: "report", at: now.toISOString(), position: [-82.41, 28.06] },
      { kind: "onboarded", at: now.toISOString() },
      { kind: "report", at: now.toISOString() },
      { kind: "report", at: now.toISOString() },
    ]);
    expect(parseStored({ not: "a list" })).toEqual([]);
  });
});

describe("impactOf", () => {
  it("invites rather than showing a zero when nothing has a place yet", () => {
    expect(impactOf(0, 0)).toEqual({ kind: "invite" });
    expect(impactOf(0, "loading")).toEqual({ kind: "invite" });
    expect(impactOf(0, "unavailable")).toEqual({ kind: "invite" });
  });

  it("shows the homes once they are counted", () => {
    expect(impactOf(2, 37)).toEqual({ kind: "homes", homes: 37, places: 2 });
  });

  it("waits while the parcel records load", () => {
    expect(impactOf(1, "loading")).toEqual({ kind: "counting", places: 1 });
  });

  it("falls back to places, never an invented number, without parcel records or nearby homes", () => {
    expect(impactOf(3, "unavailable")).toEqual({ kind: "places", places: 3, why: "no-records" });
    expect(impactOf(1, 0)).toEqual({ kind: "places", places: 1, why: "no-homes-near" });
  });
});

describe("approvedPlaces", () => {
  it("reads positions from the approved feed", () => {
    const body = {
      reports: [
        { id: "1", position: [-82.41, 28.06], depthM: 0.2, createdAt: now.toISOString(), source: "gps" },
        { id: "2", position: [-82.42, 28.05], depthM: 0.1, createdAt: now.toISOString(), source: "pin" },
      ],
    };
    expect(approvedPlaces(body)).toEqual([
      [-82.41, 28.06],
      [-82.42, 28.05],
    ]);
  });

  it("gives nothing when reports are not set up or the answer is not a feed", () => {
    expect(approvedPlaces({ error: { code: "not_configured", message: "Reports are not set up on this server yet" } })).toBeNull();
    expect(approvedPlaces(null)).toBeNull();
    expect(approvedPlaces({ reports: "no" })).toBeNull();
  });

  it("skips reports without a usable position", () => {
    const body = { reports: [{ id: "1" }, { id: "2", position: [1] }, { id: "3", position: [-82.41, 28.06] }] };
    expect(approvedPlaces(body)).toEqual([[-82.41, 28.06]]);
  });

  it("is an empty list for an empty feed", () => {
    expect(approvedPlaces({ reports: [] })).toEqual([]);
  });
});

describe("reachSlots", () => {
  it("draws a fixed set of marks and fills one per home", () => {
    const slots = reachSlots(5);
    expect(slots).toHaveLength(REACH_CAP);
    expect(slots.filter((s) => s.filled)).toHaveLength(5);
    expect(slots.slice(0, 5).every((s) => s.filled)).toBe(true); // nearest ring first
  });

  it("stops filling at the cap", () => {
    expect(reachSlots(REACH_CAP + 500).filter((s) => s.filled)).toHaveLength(REACH_CAP);
    expect(reachSlots(0).filter((s) => s.filled)).toHaveLength(0);
  });

  it("keeps every mark inside the picture", () => {
    for (const s of reachSlots(0)) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(200);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(200);
    }
  });
});
