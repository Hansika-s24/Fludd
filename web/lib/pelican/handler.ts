// Server only. The logic behind POST /api/pelican. Dependencies come in as arguments so tests pass fakes.
// The model reads the request; places come from OpenStreetMap; addresses from the county locator.
// Routes are not made here: the browser runs bestRoute on the real road graph.
import { z } from "zod";
import { apiError } from "@/lib/api";
import type { LngLat, Manifest } from "@/lib/types";
import { parseIntent, type Intent, type IntentAsker } from "./intent";
import { nearestPlaces, type PelicanPlace } from "./places";

export const pelicanInput = z.strictObject({
  text: z.string().trim().min(1).max(300),
  position: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});

export interface AddressHit {
  label: string;
  position: LngLat;
}

export interface PelicanResponse {
  intent: Intent;
  places: PelicanPlace[];
  addressMatch?: AddressHit;
}

const LOCATOR =
  "https://maps.hillsboroughcounty.org/arcgis/rest/services/Geocoding/Composite_Address_Locator_Overall/GeocodeServer";

interface Candidate {
  address: string;
  location: { x: number; y: number };
  score: number;
}

/** Best county locator match for typed text, or null. Same service as lib/address, called from the server. */
export async function lookupAddress(text: string, fetchImpl: typeof fetch = fetch): Promise<AddressHit | null> {
  const url = new URL(`${LOCATOR}/findAddressCandidates`);
  url.searchParams.set("SingleLine", text);
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("maxLocations", "5");
  url.searchParams.set("f", "json");
  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`County address lookup failed (HTTP ${res.status})`);
  const body = (await res.json()) as { candidates?: Candidate[] };
  const best = (body.candidates ?? []).reduce<Candidate | null>(
    (top, c) => (top === null || c.score > top.score ? c : top), null,
  );
  return best ? { label: best.address, position: [best.location.x, best.location.y] } : null;
}

export interface PelicanDeps {
  ask: IntentAsker | null;
  manifest: () => Promise<Manifest>;
  userAgent: string;
  fetchImpl?: typeof fetch;
}

function inside([west, south, east, north]: Manifest["bbox"], [lng, lat]: LngLat): boolean {
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export async function handlePelican(request: Request, deps: PelicanDeps): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) return apiError(400, "bad_request", "JSON body required");
  const parsed = pelicanInput.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return apiError(400, "bad_request", `${where}${issue?.message ?? "invalid body"}`);
  }
  const { text, position } = parsed.data;
  const pos: LngLat = [position[0], position[1]];
  const { intent, source } = await parseIntent(text, deps.ask);
  const out: PelicanResponse = { intent, places: [] };
  try {
    const manifest = await deps.manifest();
    if (intent.kind === "category" && intent.category) {
      out.places = await nearestPlaces(intent.category, pos, manifest.bbox, deps.userAgent, deps.fetchImpl);
    } else if (intent.kind === "address" && intent.addressText) {
      const hit = await lookupAddress(intent.addressText, deps.fetchImpl);
      if (hit && inside(manifest.bbox, hit.position)) out.addressMatch = hit;
    }
  } catch (err) {
    console.warn(`[pelican] lookup failed: ${err instanceof Error ? err.message : "error"}`);
    return apiError(502, "upstream_unavailable", "Place search is unavailable right now. Try again in a minute.");
  }
  return Response.json(out, { headers: { "x-fludd-text-source": source, "cache-control": "no-store" } });
}
