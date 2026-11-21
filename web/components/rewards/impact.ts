import type { Parcel } from "@/lib/data";
import { distanceM } from "@/lib/grade";
import type { LngLat } from "@/lib/types";
import type { Contribution } from "./contributions";

/**
 * How far one contribution reaches: 150 m, about one street block. A home this close to reported flooding
 * is on the same block or the next one, so the people in it are the ones who would drive into that water.
 * OUR ASSUMPTION: one fixed radius for every contribution. It is stated in the Rewards tab next to the number.
 */
export const REACH_RADIUS_M = 150;

/** Parcels of this type are empty lots in the county records, so nobody lives there to be helped. */
const VACANT = "VACANT RESIDENT";

/** One lived-in parcel from the county records: its folio number and where it is. */
export interface Home {
  id: string;
  position: LngLat;
}

/** The homes in parcels.json: every residential parcel except vacant lots. One parcel counts as one home. */
export function homesFrom(parcels: readonly Pick<Parcel, "folio" | "position" | "propertyType">[]): Home[] {
  return parcels.filter((p) => p.propertyType !== VACANT).map((p) => ({ id: p.folio, position: p.position }));
}

/** Where a person's contributions happened. Contributions with no place (finishing setup, a check-in) give none. */
export function placesOf(list: readonly Contribution[]): LngLat[] {
  return list.flatMap((c) => (c.position ? [c.position] : []));
}

const M_PER_DEG_LAT = 111_195;

/**
 * Homes within `radiusM` of at least one place. Each home is visited once, so a home that two contributions
 * both reach counts once.
 */
export function countHomes(places: readonly LngLat[], homes: readonly Home[], radiusM: number = REACH_RADIUS_M): number {
  if (places.length === 0) return 0;
  // A cheap box test first: the approved feed can hold hundreds of places against thousands of homes.
  const latTol = (radiusM / M_PER_DEG_LAT) * 1.01;
  let count = 0;
  for (const home of homes) {
    const [lng, lat] = home.position;
    const lngTol = latTol / Math.max(0.01, Math.cos((lat * Math.PI) / 180));
    for (const place of places) {
      if (Math.abs(place[1] - lat) > latTol || Math.abs(place[0] - lng) > lngTol) continue;
      if (distanceM(place, home.position) <= radiusM) {
        count++;
        break;
      }
    }
  }
  return count;
}

/** What the headline can honestly say. */
export type Impact =
  /** nothing with a place yet: say what one report does, never show a zero */
  | { kind: "invite" }
  /** the parcel records are still loading */
  | { kind: "counting"; places: number }
  | { kind: "homes"; homes: number; places: number }
  /** no number to give: the records did not load, or no home in them is near these places */
  | { kind: "places"; places: number; why: "no-records" | "no-homes-near" };

export function impactOf(places: number, homes: number | "loading" | "unavailable"): Impact {
  if (places === 0) return { kind: "invite" };
  if (homes === "loading") return { kind: "counting", places };
  if (homes === "unavailable") return { kind: "places", places, why: "no-records" };
  if (homes === 0) return { kind: "places", places, why: "no-homes-near" };
  return { kind: "homes", homes, places };
}

/**
 * Positions from the answer of GET /api/reports?status=approved, or null when it is not a feed
 * (reports not set up, an error). Positions there are already street-level, never exact.
 */
export function approvedPlaces(body: unknown): LngLat[] | null {
  if (typeof body !== "object" || body === null) return null;
  const reports = (body as { reports?: unknown }).reports;
  if (!Array.isArray(reports)) return null;
  const places: LngLat[] = [];
  for (const r of reports as unknown[]) {
    if (typeof r !== "object" || r === null) continue;
    const p = (r as { position?: unknown }).position;
    if (Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      places.push([p[0] as number, p[1] as number]);
    }
  }
  return places;
}

/** The reach picture: a 200 x 200 box, the person at its centre, homes on three rings around them. */
export const REACH_BOX = 200;
const RINGS = [
  { count: 10, radius: 34 },
  { count: 20, radius: 60 },
  { count: 30, radius: 86 },
] as const;
/** Marks the picture can hold. Past this the picture is full and the number carries the truth. */
export const REACH_CAP = RINGS.reduce((sum, r) => sum + r.count, 0);

export interface ReachSlot {
  x: number;
  y: number;
  /** stands for one counted home */
  filled: boolean;
}

/** Every mark of the picture, nearest ring first, clockwise from the top; the first `homes` are filled. */
export function reachSlots(homes: number): ReachSlot[] {
  const slots: ReachSlot[] = [];
  RINGS.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      // Alternate rings start half a step round, so marks do not line up like spokes.
      const angle = ((i + (ringIndex % 2) / 2) / ring.count) * 2 * Math.PI - Math.PI / 2;
      slots.push({
        x: Math.round((REACH_BOX / 2 + ring.radius * Math.cos(angle)) * 10) / 10,
        y: Math.round((REACH_BOX / 2 + ring.radius * Math.sin(angle)) * 10) / 10,
        filled: slots.length < homes,
      });
    }
  });
  return slots;
}
