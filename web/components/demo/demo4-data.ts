// Demo 4, "Food after the flood": simulated givers and the pure rules from docs/food-share.md.
// Every giver, offer and request here is made up for the walk and labelled so on screen. Nothing is sent
// anywhere. No model depth is written in this file: each one is read with depthAt() while the page runs.
import { distanceM } from "@/lib/grade";
import type { LngLat } from "@/lib/types";
import type { MapMark } from "@/components/map/map-view";
import { DEMO_CENTRE, DEMO_HOUR, DEMO_PLACE, DEMO_PUMP, DEMO_SCENARIO } from "./demo1-data";

/** Same storm, pump state, hour and neighbourhood as demo 1, so the model's flood is on screen. */
export { DEMO_HOUR, DEMO_PLACE, DEMO_PUMP, DEMO_SCENARIO };

/** The person asking stands at demo 1's crossing on E 110th Ave, which the model floods at this hour. */
export const ASKER_POSITION: LngLat = DEMO_CENTRE;

export const MILE_M = 1609.344;
export type ReachMiles = 1 | 2 | 3;

export interface DemoGiver {
  id: string;
  /** An invented name. No real business is shown. */
  name: string;
  offer: string;
  pickupWindow: string;
  reachMiles: ReachMiles;
  position: LngLat;
  /** Simulated: people inside this giver's reach who asked before the visitor did. */
  earlierPeople: number;
}

/**
 * Three simulated givers within about 1 km of the asker. The positions were picked on 2026-11-21 from the real
 * files in public/data with depthAt() at hour 18 of the 100-year storm, pumps on:
 *   a: 0.00 m, and 0.00 m at all eight points 20 m around it (about 620 m from the asker)
 *   b: 0.00 m, and 0.00 m at all eight points 20 m around it (about 440 m from the asker)
 *   c: 0.64 m (about 840 m from the asker), so the hide rule takes it off the list
 * Those figures are only why the spots were chosen. The page reads the depths again at run time.
 */
export const DEMO_GIVERS: readonly DemoGiver[] = [
  { id: "a", name: "Demo Kitchen A", offer: "100 hot meals", pickupWindow: "today, 5 to 7 pm", reachMiles: 1, position: [-82.436893, 28.046876], earlierPeople: 44 },
  { id: "b", name: "Demo Bakery B", offer: "60 bread and soup boxes", pickupWindow: "today, 4 to 6 pm", reachMiles: 2, position: [-82.426893, 28.046876], earlierPeople: 12 },
  { id: "c", name: "Demo Church Pantry C", offer: "Bottled water and 80 meals", pickupWindow: "today, 3 to 8 pm", reachMiles: 3, position: [-82.424893, 28.054076], earlierPeople: 96 },
];

// ---------- never send people through water ----------

/**
 * A pickup is hidden when the model shows this much water (0.15 m, about 6 in) or more at its door.
 * This is a walking rule, stricter than the 0.30 m used for cars. Less water than this is never called safe.
 */
export const HIDE_AT_M = 0.15;

/** null means the model has no value here (the toy data set): nothing is hidden on a missing value. */
export function isHidden(depthM: number | null): boolean {
  return depthM !== null && Number.isFinite(depthM) && depthM >= HIDE_AT_M;
}

// ---------- reach and matching ----------

export function reachM(giver: Pick<DemoGiver, "reachMiles">): number {
  return giver.reachMiles * MILE_M;
}

/** True when the position is inside the giver's radius (the edge counts). */
export function covers(giver: Pick<DemoGiver, "position" | "reachMiles">, position: LngLat): boolean {
  return distanceM(giver.position, position) <= reachM(giver);
}

const M_PER_DEG_LAT = 111_320;

/**
 * A position snapped to the middle of a square about `cellM` across. The design keeps only this rounded
 * position for a receiver, so a request cannot point to one house.
 */
export function roundPosition([lng, lat]: LngLat, cellM = 500): LngLat {
  const latStep = cellM / M_PER_DEG_LAT;
  const cellLat = (Math.floor(lat / latStep) + 0.5) * latStep;
  const lngStep = cellM / (M_PER_DEG_LAT * Math.cos((cellLat * Math.PI) / 180));
  const cellLng = (Math.floor(lng / lngStep) + 0.5) * lngStep;
  return [Number(cellLng.toFixed(6)), Number(cellLat.toFixed(6))];
}

export interface Match {
  giver: DemoGiver;
  distanceM: number;
}

/**
 * The givers a receiver is shown: reach covers the (rounded) position, pickup not hidden by the water rule,
 * nearest first. `depths` lines up with `givers`; a missing or null depth hides nothing.
 */
export function matchGivers(givers: readonly DemoGiver[], depths: readonly (number | null)[], position: LngLat): Match[] {
  return givers
    .filter((g, i) => covers(g, position) && !isHidden(depths[i] ?? null))
    .map((giver) => ({ giver, distanceM: distanceM(giver.position, position) }))
    .sort((x, y) => x.distanceM - y.distanceM);
}

/** "0.4 mi" */
export function distanceWords(m: number): string {
  return `${(m / MILE_M).toFixed(1)} mi`;
}

// ---------- what the giver sees ----------

export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 6;

export function clampPeople(n: number): number {
  return Math.max(MIN_PEOPLE, Math.min(MAX_PEOPLE, Math.round(n)));
}

/**
 * The only thing a giver learns about receivers: a count, rounded to the nearest 10 below 100 so it can
 * never point to one household. From 100 up the count is shown as it is.
 */
export function giverCount(people: number): number {
  const n = Math.max(0, Math.round(people));
  return n < 100 ? Math.round(n / 10) * 10 : n;
}

/** "about 40 people nearby asked for meals" */
export function countWords(people: number): string {
  if (people <= 0) return "no one nearby has asked yet";
  const shown = giverCount(people);
  if (shown === 0) return "fewer than 10 people nearby asked for meals";
  return `about ${shown} people nearby asked for meals`;
}

// ---------- pickup code ----------

/** No 0, O, 1, I or L, so a code read aloud at a counter is not misheard. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

/** A random code that carries no identity. `random` returns a number in [0, 1), like Math.random. */
export function pickupCode(random: () => number): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const at = Math.min(CODE_ALPHABET.length - 1, Math.max(0, Math.floor(random() * CODE_ALPHABET.length)));
    code += CODE_ALPHABET[at];
  }
  return code;
}

// ---------- the map rings ----------

const GIVER_SIZE = 22;
/** The pale ring stands for the reach. It is a picture of "wider", not the radius drawn to scale. */
const REACH_SIZE: Record<ReachMiles, number> = { 1: 96, 2: 132, 3: 168 };
const REACH_COLOR = "color-mix(in srgb, var(--color-tint) 35%, transparent)";

/**
 * Rings for the givers on screen: a pale reach ring under a small giver ring. A hidden giver loses its reach
 * ring and turns the warning colour; its id changes too, because the map keeps a ring it has already drawn.
 */
export function giverMarks(givers: readonly DemoGiver[], hidden: readonly boolean[] = []): MapMark[] {
  return givers.flatMap((g, i): MapMark[] => {
    if (hidden[i]) {
      return [{ id: `${g.id}-hidden`, position: g.position, color: "var(--color-warn)", size: GIVER_SIZE, label: `${g.name} · hidden` }];
    }
    return [
      { id: `${g.id}-reach`, position: g.position, color: REACH_COLOR, size: REACH_SIZE[g.reachMiles], label: `Reach ${g.reachMiles} mi` },
      { id: g.id, position: g.position, color: "var(--color-tint)", size: GIVER_SIZE, label: g.name },
    ];
  });
}

/** The asker as the design stores them: a spot rounded to about 500 m, never the door. */
export function askerMark(position: LngLat): MapMark {
  return { id: "asker", position: roundPosition(position), color: "var(--color-safe)", size: 56, label: "A request, to about 500 m" };
}
