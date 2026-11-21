// findBetterOptions on the toy fixture with a small hand-made parcels.json (the toy fixture has none).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDataCache, loadParcels, type Parcel } from "@/lib/data";
import { distanceM } from "@/lib/grade";
import { findBetterOptions, parcelLetter } from "@/lib/parcels";
import type { LngLat } from "@/lib/types";
import { diskFetch } from "../data/fixture-fetch";

const toyCell = (c: number, r: number): LngLat => [-82.42 + ((c + 0.5) / 48) * 0.012, 28.064 - ((r + 0.5) / 36) * 0.009];
/** Bottom of toy bowl 2, zone AE: an F. */
const here = toyCell(34, 18);
/** A point `m` metres north of `here` (1 degree of latitude is about 111,195 m). */
const north = (m: number): LngLat => [here[0], here[1] + m / 111195];

type Depths = Partial<Record<"10yr" | "25yr" | "100yr" | "500yr", number>>;
let n = 0;
function home(position: LngLat, more: Partial<Parcel> = {}, on: Depths = {}, off: Depths = on): Parcel {
  const peakDepthM: Record<string, number> = { "milton-on": 0, "milton-off": 0 };
  for (const s of ["10yr", "25yr", "100yr", "500yr"] as const) {
    peakDepthM[`${s}-on`] = on[s] ?? 0;
    peakDepthM[`${s}-off`] = off[s] ?? 0;
  }
  n += 1;
  return {
    folio: String(n).padStart(10, "0"), address: `${n} Test St`, position, assessedValue: 200000, beds: 3, baths: 2,
    livingAreaSqft: 1400, propertyType: "SINGLE FAMILY", peakDepthM,
    femaHighRisk: false, femaShadedX: false, miltonPointWithin100m: false, ...more,
  };
}

function serve(parcels: Parcel[]): void {
  const inner = diskFetch();
  vi.stubGlobal("fetch", async (u: string) =>
    u.endsWith("/parcels.json") ? new Response(JSON.stringify(parcels)) : inner(u));
}

beforeEach(() => clearDataCache());
afterEach(() => vi.unstubAllGlobals());

describe("parcelLetter", () => {
  it("grades from pump-on depths, pump-off for the pump notch, and the flags", () => {
    expect(parcelLetter(home(here))).toBe("A");
    expect(parcelLetter(home(here, {}, { "100yr": 0.2, "500yr": 0.3 }))).toBe("C");
    expect(parcelLetter(home(here, {}, {}, { "500yr": 0.2 }))).toBe("B");
    expect(parcelLetter(home(here, {}, { "100yr": 0.31 }))).toBe("D"); // floor notch
    expect(parcelLetter(home(here, { femaHighRisk: true }))).toBe("C");
    expect(parcelLetter(home(here, { femaShadedX: true }))).toBe("B");
    expect(parcelLetter(home(here, { miltonPointWithin100m: true }))).toBe("C");
  });
});

describe("loadParcels", () => {
  it("rejects a parcel without the depths the grade needs", async () => {
    const broken = home(here);
    delete broken.peakDepthM["25yr-off"];
    serve([broken]);
    await expect(loadParcels()).rejects.toThrow(/parcels\.json.*0\.peakDepthM\.25yr-off/);
  });
  it("names the file when it is missing (the toy fixture has none)", async () => {
    vi.stubGlobal("fetch", diskFetch());
    await expect(loadParcels()).rejects.toThrow(/parcels\.json.*404/);
  });
});

describe("findBetterOptions with a reference home", () => {
  const ref = home(here, {}, { "10yr": 0.5, "25yr": 0.5, "100yr": 0.5, "500yr": 0.5 });
  const a = home(north(220), { assessedValue: 210000 });                                   // A
  const i = home(north(400), { assessedValue: 230000 }, {}, { "500yr": 0.2 });             // B (pump)
  const b = home(north(110), { assessedValue: 190000, beds: 4 }, { "100yr": 0.2, "500yr": 0.2 }); // C
  const h = home(north(80), { femaHighRisk: true });                                        // C (cap), nearer
  const sameF = home(north(70), {}, { "10yr": 0.2 });                                      // F: not better
  const otherType = home(north(150), { propertyType: "MULTI-FAMILY" });
  const pricey = home(north(160), { assessedValue: 241000 });
  const cheap = home(north(170), { assessedValue: 159000 });
  const bigger = home(north(180), { beds: 5 });
  const far = home(north(1700));
  const all = [ref, a, i, b, h, sameF, otherType, pricey, cheap, bigger, far];

  it("keeps similar homes with a strictly better letter, best first then nearest", async () => {
    serve(all);
    const got = await findBetterOptions(here);
    expect(got.map((o) => [o.address, o.grade])).toEqual([
      [a.address, "A"], [i.address, "B"], [h.address, "C"], [b.address, "C"],
    ]);
    expect(got[0].distanceM).toBe(Math.round(distanceM(here, a.position)));
    expect(Number.isInteger(got[3].distanceM)).toBe(true);
    expect(got[0]).toMatchObject({
      position: a.position, assessedValue: 210000, beds: 3, baths: 2, livingAreaSqft: 1400, propertyType: "SINGLE FAMILY",
    });
  });

  it("price band is inclusive at exactly 20%", async () => {
    serve([ref, home(north(200), { assessedValue: 240000 }), home(north(210), { assessedValue: 160000 })]);
    expect(await findBetterOptions(here)).toHaveLength(2);
  });

  it("skips the beds rule for VACANT RESIDENT", async () => {
    const v = { propertyType: "VACANT RESIDENT", beds: 0 };
    serve([home(here, v, { "10yr": 0.5 }), home(north(300), { ...v, beds: 4 })]);
    expect(await findBetterOptions(here)).toHaveLength(1);
  });

  it("returns at most 10", async () => {
    serve([ref, ...Array.from({ length: 15 }, (_, k) => home(north(100 + k * 20)))]);
    const got = await findBetterOptions(here);
    expect(got).toHaveLength(10);
    expect(got.map((o) => o.distanceM)).toEqual([...got.map((o) => o.distanceM)].sort((x, y) => x - y));
  });

  it("returns [] outside the grid", async () => {
    serve(all);
    expect(await findBetterOptions([-82.5, 28.1])).toEqual([]);
  });

  it("returns [] when the position is already an A", async () => {
    const corner = toyCell(1, 1);
    serve([home(corner), home([corner[0], corner[1] - 0.001])]);
    expect(await findBetterOptions(corner)).toEqual([]);
  });
});

describe("findBetterOptions with no home within 60 m", () => {
  it("matches any residential type within 20% of the median value within 300 m, beds ignored", async () => {
    const near = [
      home(north(100), { assessedValue: 100000 }),
      home(north(200), { assessedValue: 110000, propertyType: "MULTI-FAMILY", beds: 8 }),
      home(north(280), { assessedValue: 120000, propertyType: "MOBILE HOMES" }),
    ];
    const vacant = home(north(1000), { assessedValue: 95000, propertyType: "VACANT RESIDENT", beds: 0 });
    const outOfBand = home(north(1100), { assessedValue: 300000 });
    serve([...near, vacant, outOfBand]);
    const got = await findBetterOptions(here);
    expect(got.map((o) => o.address)).toEqual([...near, vacant].map((p) => p.address));
  });

  it("returns [] when no home is within 300 m", async () => {
    serve([home(north(400))]);
    expect(await findBetterOptions(here)).toEqual([]);
  });
});
