// Server only. Real places of one kind inside the study box, from OpenStreetMap through the Overpass API.
// Nothing here is generated: names and positions are what OSM holds. One fetch per category per process.
// The public Overpass server is often at capacity (502 at 14:40 on 2026-11-21), so on failure the keyless
// ArcGIS World geocoder's category search is asked instead; its answers are not cached.
import type { LngLat, Manifest } from "@/lib/types";
import type { Category } from "./intent";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TIMEOUT_MS = 8_000;
export const MAX_PLACES = 5;

export const ARCGIS_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

/** ArcGIS place categories per Pelican category; null means no fallback for it. */
const ARCGIS_CATEGORY: Record<Category, string | null> = {
  grocery: "Grocery,Supermarket",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  gas: "Gas Station",
  shelter: null,
  school: "School",
  work_other: "Library,City Hall,Police Station,Fire Station",
};

export interface PelicanPlace {
  name: string;
  position: LngLat;
  distanceM: number;
}

const TAGS: Record<Category, string[]> = {
  grocery: ['["shop"~"^(supermarket|convenience|greengrocer)$"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  hospital: ['["amenity"="hospital"]'],
  gas: ['["amenity"="fuel"]'],
  shelter: ['["amenity"~"^(shelter|social_facility)$"]', '["emergency"="assembly_point"]'],
  school: ['["amenity"="school"]'],
  work_other: ['["amenity"~"^(library|community_centre|townhall|police|fire_station)$"]'],
};

const FALLBACK_NAME: Record<Category, string> = {
  grocery: "Grocery store",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  gas: "Gas station",
  shelter: "Shelter",
  school: "School",
  work_other: "Public building",
};

export function overpassQuery(category: Category, bbox: Manifest["bbox"]): string {
  const [west, south, east, north] = bbox;
  const box = `(${south},${west},${north},${east})`;
  const parts = TAGS[category].flatMap((t) => [`node${t}${box};`, `way${t}${box};`]);
  return `[out:json][timeout:10];(${parts.join("")});out center 60;`;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Metres between two points (haversine). */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const r = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

type Fetch = typeof fetch;
const cache = new Map<Category, Promise<{ name: string; position: LngLat }[]>>();

/** After an Overpass failure, go straight to the fallback for this long so nobody waits 8 s again. */
const OVERPASS_BACKOFF_MS = 120_000;
let overpassDownUntil = 0;

/** Forget cached places and back-off (tests). */
export function clearPlacesCache(): void {
  cache.clear();
  overpassDownUntil = 0;
}

async function fetchAll(category: Category, bbox: Manifest["bbox"], userAgent: string, fetchImpl: Fetch) {
  const res = await fetchImpl(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": userAgent },
    body: `data=${encodeURIComponent(overpassQuery(category, bbox))}`,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Overpass failed (HTTP ${res.status})`);
  const body = (await res.json()) as { elements?: OverpassElement[] };
  const [west, south, east, north] = bbox;
  const seen = new Set<string>();
  const out: { name: string; position: LngLat }[] = [];
  for (const el of body.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    if (lon < west || lon > east || lat < south || lat > north) continue;
    const name = el.tags?.name?.trim() || el.tags?.brand?.trim() || FALLBACK_NAME[category];
    const key = `${name}|${lon.toFixed(4)}|${lat.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: name.slice(0, 80), position: [lon, lat] });
  }
  return out;
}

async function fetchArcgis(category: Category, position: LngLat, bbox: Manifest["bbox"], fetchImpl: Fetch) {
  const cats = ARCGIS_CATEGORY[category];
  if (!cats) return [];
  const url = new URL(ARCGIS_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("category", cats);
  url.searchParams.set("location", `${position[0]},${position[1]}`);
  url.searchParams.set("searchExtent", bbox.join(","));
  url.searchParams.set("maxLocations", "20");
  url.searchParams.set("outSR", "4326");
  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ArcGIS place search failed (HTTP ${res.status})`);
  const body = (await res.json()) as { candidates?: { address: string; location: { x: number; y: number } }[] };
  const [west, south, east, north] = bbox;
  return (body.candidates ?? [])
    .filter((c) => c.location.x >= west && c.location.x <= east && c.location.y >= south && c.location.y <= north)
    .map((c) => ({ name: (c.address || FALLBACK_NAME[category]).slice(0, 80), position: [c.location.x, c.location.y] as LngLat }));
}

/** Up to MAX_PLACES real places of the category, nearest first. Throws if both sources fail. */
export async function nearestPlaces(
  category: Category,
  position: LngLat,
  bbox: Manifest["bbox"],
  userAgent: string,
  fetchImpl: Fetch = fetch,
): Promise<PelicanPlace[]> {
  let hit = cache.get(category);
  if (!hit && Date.now() < overpassDownUntil) hit = Promise.reject(new Error("Overpass recently down"));
  if (!hit) {
    hit = fetchAll(category, bbox, userAgent, fetchImpl);
    cache.set(category, hit);
    hit.catch(() => {
      cache.delete(category); // retried once the back-off ends
      overpassDownUntil = Date.now() + OVERPASS_BACKOFF_MS;
    });
  }
  let all: { name: string; position: LngLat }[];
  try {
    all = await hit;
  } catch (err) {
    console.warn(`[pelican] Overpass failed, trying ArcGIS: ${err instanceof Error ? err.message : "error"}`);
    all = await fetchArcgis(category, position, bbox, fetchImpl);
  }
  return all
    .map((p) => ({ ...p, distanceM: Math.round(distanceM(position, p.position)) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_PLACES);
}
