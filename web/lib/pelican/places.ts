// Server only. Real places of one kind inside the study box, from OpenStreetMap through the Overpass API.
// Nothing here is generated: names and positions are what OSM holds. One fetch per category per process.
import type { LngLat, Manifest } from "@/lib/types";
import type { Category } from "./intent";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TIMEOUT_MS = 8_000;
export const MAX_PLACES = 5;

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

/** Forget cached places (tests). */
export function clearPlacesCache(): void {
  cache.clear();
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

/** Up to MAX_PLACES real places of the category, nearest first. Throws if Overpass fails. */
export async function nearestPlaces(
  category: Category,
  position: LngLat,
  bbox: Manifest["bbox"],
  userAgent: string,
  fetchImpl: Fetch = fetch,
): Promise<PelicanPlace[]> {
  let hit = cache.get(category);
  if (!hit) {
    hit = fetchAll(category, bbox, userAgent, fetchImpl);
    cache.set(category, hit);
    hit.catch(() => cache.delete(category)); // a failure is retried next request
  }
  const all = await hit;
  return all
    .map((p) => ({ ...p, distanceM: Math.round(distanceM(position, p.position)) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_PLACES);
}
