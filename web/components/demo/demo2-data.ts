import type { Grade, GradeResult, Letter, LngLat } from "@/lib/types";

export interface DemoAddress {
  id: "fine" | "missed";
  /** Street address from the county parcels file (the site address, never an owner field). */
  label: string;
  /** House number: the caption under the ring on the map, short enough for both to fit a phone screen. */
  short: string;
  position: LngLat;
}

/**
 * The two homes in demo 2. Both are single-family parcels on the same street, about 265 m apart, and the
 * official map puts both in Zone X, minimal flood hazard.
 *
 * How they were chosen (2026-11-21, data version real-2026-11-21): every single-family parcel in
 * web/public/data/parcels.json outside the FEMA high-risk and shaded-X zones, with a Hurricane Milton damage
 * point within 100 m and 0.3 m or more of water at the building in hurricane-level rain, was graded with
 * gradeFor. Two came back D or F with "Zone X, minimal"; this one had the more ordinary depths (6 to 12 in in
 * a heavy thunderstorm, not over 2 ft). The dry home is the nearest similar home findBetterOptions returns
 * for it. No single-family home within 200 m of the flooded one graded A or B.
 *
 * Grades when chosen: 1415 E 139th Ave = A (range A to A), 1519 E 139th Ave = F (range F to F, a Milton
 * damage point 8 m away). The page grades both again at runtime, so it never shows a stale letter.
 */
export const ADDRESSES: readonly [DemoAddress, DemoAddress] = [
  { id: "fine", label: "1415 E 139th Ave", short: "1415", position: [-82.443572, 28.073536] },
  { id: "missed", label: "1519 E 139th Ave", short: "1519", position: [-82.440871, 28.073515] },
];

const ORDER: Letter[] = ["A", "B", "C", "D", "F"];

/** Halfway between two positions: where the camera sits to show both. */
export function midpoint(a: LngLat, b: LngLat): LngLat {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Index of the address with the worse letter. On a tie it is the second, the one the walk is about. */
export function weakerIndex(letters: readonly [Letter, Letter]): 0 | 1 {
  return ORDER.indexOf(letters[0]) > ORDER.indexOf(letters[1]) ? 0 : 1;
}

/** Both grades, or null when either spot could not be graded (off the grid, as on the toy data set). */
export function usableGrades(results: readonly GradeResult[]): [Grade, Grade] | null {
  const [a, b] = results;
  if (results.length !== 2 || a.kind !== "ok" || b.kind !== "ok") return null;
  return [a, b];
}

/** The colour that repeats a letter's meaning: text class for the card, CSS colour for the ring on the map. */
export function letterTone(letter: Letter): { text: string; color: string } {
  if (letter === "A" || letter === "B") return { text: "text-safe", color: "var(--color-safe)" };
  if (letter === "C") return { text: "text-warn", color: "var(--color-warn)" };
  return { text: "text-late", color: "var(--color-late)" };
}

/** "$281,309": whole dollars. */
export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** "490 ft" up close, "0.2 mi" beyond about a block: the same rule as the report card. */
export function distanceWords(m: number): string {
  return m < 160 ? `${Math.round(m * 3.28)} ft` : `${(m / 1609).toFixed(1)} mi`;
}
