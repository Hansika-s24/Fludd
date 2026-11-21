import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePelican } from "@/lib/pelican/handler";
import { clearPlacesCache, nearestPlaces, overpassQuery } from "@/lib/pelican/places";
import type { LngLat, Manifest } from "@/lib/types";

const BBOX: Manifest["bbox"] = [-82.4467, 28.0297, -82.3811, 28.0877];
const USF: LngLat = [-82.4139, 28.0587];

const elements = [
  { type: "node", lat: 28.06, lon: -82.414, tags: { name: "Near Market" } },
  { type: "way", center: { lat: 28.08, lon: -82.43 }, tags: { name: "Far Grocer" } },
  { type: "node", lat: 28.065, lon: -82.42, tags: { brand: "Publix" } },
  { type: "node", lat: 27.9, lon: -82.4, tags: { name: "Outside Box" } },
  { type: "node", lat: 28.07, lon: -82.41 },
];

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
}

beforeEach(() => clearPlacesCache());

describe("overpassQuery", () => {
  it("asks for nodes and ways inside the box", () => {
    const q = overpassQuery("grocery", BBOX);
    expect(q.startsWith("[out:json][timeout:10];")).toBe(true);
    expect(q).toContain("node[\"shop\"~\"^(supermarket|convenience|greengrocer)$\"](28.0297,-82.4467,28.0877,-82.3811);");
    expect(q).toContain("way[");
    expect(q.endsWith("out center 60;")).toBe(true);
  });
});

describe("nearestPlaces", () => {
  it("returns real places inside the box, nearest first, and caches per category", async () => {
    const f = fakeFetch({ elements });
    const places = await nearestPlaces("grocery", USF, BBOX, "test-agent", f);
    expect(places.map((p) => p.name)).toEqual(["Near Market", "Publix", "Grocery store", "Far Grocer"]);
    expect(places[0].distanceM).toBeLessThan(places[1].distanceM);
    const init = f.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(String(init?.body).startsWith("data=")).toBe(true);
    expect((init?.headers as Record<string, string>)["user-agent"]).toBe("test-agent");
    await nearestPlaces("grocery", USF, BBOX, "test-agent", f);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("falls back to ArcGIS category search when Overpass is down", async () => {
    const f = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("overpass")
        ? new Response("busy", { status: 502 })
        : Response.json({
          candidates: [
            { address: "Winn Dixie", location: { x: -82.4286, y: 28.0563 } },
            { address: "Publix Super Markets", location: { x: -82.4119, y: 28.0684 } },
            { address: "Far Away", location: { x: -82.0, y: 28.0 } },
          ],
        }),
    );
    const places = await nearestPlaces("grocery", USF, BBOX, "ua", f);
    expect(places.map((p) => p.name)).toEqual(["Publix Super Markets", "Winn Dixie"]);
    expect(String(f.mock.calls[1][0])).toContain("category=Grocery");
  });

  it("throws on an Overpass error and does not cache it", async () => {
    await expect(nearestPlaces("pharmacy", USF, BBOX, "ua", fakeFetch({}, 504))).rejects.toThrow(/504/);
    // Within the back-off, Overpass is skipped: only the fallback is asked.
    const skip = fakeFetch({ candidates: [] });
    await nearestPlaces("pharmacy", USF, BBOX, "ua", skip);
    expect(String(skip.mock.calls[0][0])).toContain("arcgis");
    clearPlacesCache();
    const ok = await nearestPlaces("pharmacy", USF, BBOX, "ua", fakeFetch({ elements: [elements[0]] }));
    expect(ok).toHaveLength(1);
  });
});

describe("handlePelican", () => {
  const manifest = async () => ({ bbox: BBOX }) as Manifest;
  const post = (body: unknown) =>
    new Request("http://x/api/pelican", { method: "POST", body: JSON.stringify(body) });

  it("rejects bad input in the shared error shape", async () => {
    const res = await handlePelican(post({ text: "", position: USF }), { ask: null, manifest, userAgent: "ua" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("bad_request");
  });

  it("returns intent and places with the text-source header", async () => {
    const res = await handlePelican(post({ text: "groceries", position: USF }), {
      ask: null, manifest, userAgent: "ua", fetchImpl: fakeFetch({ elements }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fludd-text-source")).toBe("off");
    const body = (await res.json()) as { intent: { category: string }; places: unknown[] };
    expect(body.intent.category).toBe("grocery");
    expect(body.places).toHaveLength(4);
  });

  it("resolves a typed address inside the box", async () => {
    const f = fakeFetch({ candidates: [{ address: "4202 E FOWLER AVE", location: { x: -82.4139, y: 28.0587 }, score: 100 }] });
    const res = await handlePelican(post({ text: "drive to 4202 E Fowler Ave", position: USF }), {
      ask: null, manifest, userAgent: "ua", fetchImpl: f,
    });
    const body = (await res.json()) as { addressMatch?: { label: string } };
    expect(body.addressMatch?.label).toBe("4202 E FOWLER AVE");
  });

  it("answers 502 when place search is down", async () => {
    const res = await handlePelican(post({ text: "hospital", position: USF }), {
      ask: null, manifest, userAgent: "ua", fetchImpl: fakeFetch({}, 500),
    });
    expect(res.status).toBe(502);
  });
});
