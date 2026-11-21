// Address search through the Hillsborough County composite locator, with fetch mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAddress, suggestAddresses } from "@/lib/address";
import { clearDataCache } from "@/lib/data";
import { diskFetch } from "../data/fixture-fetch";

const LOCATOR = "https://maps.hillsboroughcounty.org/arcgis/rest/services/Geocoding/Composite_Address_Locator_Overall/GeocodeServer";

let calls: string[] = [];
function mockCounty(handler: (url: URL) => unknown, status = 200) {
  vi.stubGlobal("fetch", diskFetch((u) => {
    calls.push(u);
    return new Response(JSON.stringify(handler(new URL(u))), { status });
  }));
}

beforeEach(() => {
  calls = [];
  clearDataCache();
});
afterEach(() => vi.unstubAllGlobals());

describe("suggestAddresses", () => {
  it("calls the county suggest endpoint and maps text to label", async () => {
    mockCounty(() => ({
      suggestions: [
        { text: "4202 E Fowler Ave, Tampa", magicKey: "KEY1", isCollection: false },
        { text: "4202 E Fowler Ave, Thonotosassa", magicKey: "KEY2", isCollection: false },
      ],
    }));
    const s = await suggestAddresses("4202 E Fowl");
    const url = new URL(calls[0]);
    expect(`${url.origin}${url.pathname}`).toBe(`${LOCATOR}/suggest`);
    expect(url.searchParams.get("text")).toBe("4202 E Fowl");
    expect(url.searchParams.get("f")).toBe("json");
    expect(s.map((x) => x.label)).toEqual(["4202 E Fowler Ave, Tampa", "4202 E Fowler Ave, Thonotosassa"]);
    expect(new Set(s.map((x) => x.id)).size).toBe(2);
  });

  it("returns nothing for blank text without calling the server", async () => {
    mockCounty(() => ({ suggestions: [] }));
    expect(await suggestAddresses("   ")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("throws a clear error when the locator fails", async () => {
    mockCounty(() => ({}), 503);
    await expect(suggestAddresses("4202")).rejects.toThrow(/address suggest.*503/i);
  });

  it("throws when the locator answers with an ArcGIS error body", async () => {
    mockCounty(() => ({ error: { code: 400, message: "Invalid" } }));
    await expect(suggestAddresses("4202")).rejects.toThrow(/Invalid/);
  });
});

describe("resolveAddress", () => {
  it("sends the suggestion text and magicKey, returns the best candidate in lng/lat, inside the toy box", async () => {
    mockCounty((url) => url.pathname.endsWith("/suggest")
      ? { suggestions: [{ text: "4202 E Fowler Ave, Tampa", magicKey: "KEY1", isCollection: false }] }
      : {
        spatialReference: { wkid: 4326 },
        candidates: [
          { address: "4202 E Fowler Ave, Tampa, 33620 (low)", location: { x: -82.5, y: 28.1 }, score: 80 },
          { address: "4202 E Fowler Ave, Tampa, 33620", location: { x: -82.4139475455857, y: 28.061936669896859 }, score: 100 },
        ],
      });
    const [s] = await suggestAddresses("4202 E Fowl");
    const m = await resolveAddress(s.id);
    const url = new URL(calls[1]);
    expect(`${url.origin}${url.pathname}`).toBe(`${LOCATOR}/findAddressCandidates`);
    expect(url.searchParams.get("magicKey")).toBe("KEY1");
    expect(url.searchParams.get("SingleLine")).toBe("4202 E Fowler Ave, Tampa");
    expect(url.searchParams.get("outSR")).toBe("4326");
    expect(url.searchParams.get("f")).toBe("json");
    expect(m).toEqual({ label: "4202 E Fowler Ave, Tampa, 33620", position: [-82.4139475455857, 28.061936669896859], inside: true });
  });

  it("marks a match outside the manifest bbox as not inside", async () => {
    mockCounty(() => ({ candidates: [{ address: "1 Far Rd", location: { x: -82.5, y: 28.1 }, score: 100 }] }));
    expect(await resolveAddress("KEY9|1 Far Rd")).toEqual({ label: "1 Far Rd", position: [-82.5, 28.1], inside: false });
  });

  it("returns null when there is no candidate", async () => {
    mockCounty(() => ({ candidates: [] }));
    expect(await resolveAddress("KEY9|Nowhere")).toBeNull();
  });
});
