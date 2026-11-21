// Food share: givers (restaurants, stores, churches) offer food within a radius; receivers ask anonymously.
// Pure logic, no I/O. Design: docs/food-share.md. Added at Harshith's request, 2026-11-21 16:35.
import { z } from "zod";
import type { LngLat } from "@/lib/types";

export const MI = 1609.34;

/** What can be given or asked for: not just meals. */
export const KINDS = ["meals", "groceries", "water", "baby", "hygiene", "pet", "medicine"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_WORDS: Record<Kind, string> = {
  meals: "Hot meals",
  groceries: "Groceries",
  water: "Drinking water",
  baby: "Baby supplies",
  hygiene: "Hygiene and cleaning",
  pet: "Pet food",
  medicine: "Medicine pickup",
};
const kind = z.enum(KINDS);
/** Receivers' positions are kept only to this grid (about 500 m), never the exact point. */
export const CELL_DEG = 0.005;
/** A request counts for this long, then it is ignored (and deleted by the store). */
export const REQUEST_TTL_MS = 48 * 3_600_000;

export interface Giver {
  id: string;
  name: string;
  address: string;
  position: LngLat;
  radiusMi: 1 | 2 | 3;
  kinds: Kind[];
  offer: string;
  window: string;
  /** People served so far, as the giver reported them. */
  served: number;
  /** sha256 of the giver's private manage token. */
  tokenHash: string;
  createdAt: string;
}

export interface FoodRequest {
  id: string;
  cell: LngLat;
  people: number;
  needs: Kind[];
  codeHash: string;
  createdAt: string;
}

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const NewGiver = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(160),
  position: lngLat,
  radiusMi: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kinds: z.array(kind).min(1).max(KINDS.length),
  offer: z.string().trim().min(3).max(160),
  window: z.string().trim().min(3).max(80),
});

export const NewRequest = z.object({
  position: lngLat,
  people: z.number().int().min(1).max(12),
  needs: z.array(kind).max(KINDS.length).default([]),
});

/** Round a position to the request grid, so a request never points at one home. */
export function toCell([lng, lat]: LngLat): LngLat {
  const r = (v: number) => Math.round(v / CELL_DEG) * CELL_DEG;
  return [Number(r(lng).toFixed(4)), Number(r(lat).toFixed(4))];
}

export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const k = Math.PI / 180;
  const x = (lng2 - lng1) * k * Math.cos(((lat1 + lat2) / 2) * k);
  const y = (lat2 - lat1) * k;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

export function covers(g: Pick<Giver, "position" | "radiusMi">, cell: LngLat): boolean {
  return distanceM(g.position, cell) <= g.radiusMi * MI;
}

export function live(requests: readonly FoodRequest[], now: number): FoodRequest[] {
  return requests.filter((r) => now - Date.parse(r.createdAt) < REQUEST_TTL_MS);
}

/** What a giver sees: how many people asked inside their radius. A count only, rounded so it never singles anyone out. */
export function demandFor(g: Giver, requests: readonly FoodRequest[], now: number): { requests: number; people: number } {
  const mine = live(requests, now).filter((r) => covers(g, r.cell));
  return { requests: roughCount(mine.length), people: roughCount(mine.reduce((s, r) => s + r.people, 0)) };
}

/** Exact below 5 would let a giver guess a household, so small counts read as "fewer than 5" (returned as 0..4 → 4). */
export function roughCount(n: number): number {
  if (n === 0) return 0;
  if (n < 5) return 4;
  return n < 100 ? Math.round(n / 5) * 5 : Math.round(n / 10) * 10;
}

/** Givers whose radius reaches a receiver's cell and who offer something they need (any, if none picked), nearest first. */
export function giversFor(cell: LngLat, givers: readonly Giver[], needs: readonly Kind[] = []): (Giver & { distanceM: number })[] {
  return givers
    .filter((g) => covers(g, cell) && (needs.length === 0 || g.kinds.some((k) => needs.includes(k))))
    .map((g) => ({ ...g, distanceM: distanceM(g.position, cell) }))
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** Public leaderboard: givers by people served, totals rounded to tens. */
export function leaderboard(givers: readonly Giver[]): { name: string; served: number; radiusMi: number }[] {
  return givers
    .filter((g) => g.served > 0)
    .map((g) => ({ name: g.name, served: g.served < 10 ? g.served : Math.round(g.served / 10) * 10, radiusMi: g.radiusMi }))
    .sort((a, b) => b.served - a.served)
    .slice(0, 10);
}

/** What anyone may see about a giver: never the token hash. */
export function publicGiver(g: Giver) {
  return { id: g.id, name: g.name, address: g.address, position: g.position, radiusMi: g.radiusMi, kinds: g.kinds, offer: g.offer, window: g.window };
}
