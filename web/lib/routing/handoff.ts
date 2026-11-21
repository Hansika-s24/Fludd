// Open a Fludd route in the phone's own maps app (Google Maps or Apple Maps).
// Those apps do not know the flood model, so Google Maps is given points along OUR route as waypoints,
// which keeps it on the path that avoids roads expected to close. Apple Maps links cannot carry
// waypoints, so they get the start and end only: the interface must warn that Apple Maps may choose
// other roads. Neither link says any road is safe to drive.
import type { LngLat, VehicleClass } from "@/lib/types";

/** Google Maps URLs keep up to 3 waypoints reliably on phones. */
export const MAX_WAYPOINTS = 3;

export interface MapsHandoff {
  google: string;
  apple: string;
  /** false: Apple Maps gets only the start and end and may pick other roads. */
  appleFollowsRoute: false;
}

const latLng = ([lng, lat]: LngLat) => `${round(lat)},${round(lng)}`;
const round = (v: number) => Number(v.toFixed(6));

/** Links for a route line (from bestRoute or a "move your car" route). null without at least two points. */
export function mapsHandoff(line: LngLat[], vehicle: VehicleClass = "car"): MapsHandoff | null {
  if (line.length < 2) return null;
  const start = line[0];
  const end = line[line.length - 1];
  const inner = line.slice(1, -1);
  const count = Math.min(MAX_WAYPOINTS, inner.length);
  // evenly spaced points along the inner part of the line
  const waypoints = Array.from({ length: count }, (_, k) => inner[Math.floor(((k + 1) * inner.length) / (count + 1))]);
  const walking = vehicle === "foot";

  const google = new URL("https://www.google.com/maps/dir/");
  google.searchParams.set("api", "1");
  google.searchParams.set("origin", latLng(start));
  google.searchParams.set("destination", latLng(end));
  if (waypoints.length) google.searchParams.set("waypoints", waypoints.map(latLng).join("|"));
  google.searchParams.set("travelmode", walking ? "walking" : "driving");

  const apple = new URL("https://maps.apple.com/");
  apple.searchParams.set("saddr", latLng(start));
  apple.searchParams.set("daddr", latLng(end));
  apple.searchParams.set("dirflg", walking ? "w" : "d");

  return { google: google.toString(), apple: apple.toString(), appleFollowsRoute: false };
}
