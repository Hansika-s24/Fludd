// Address search through the Hillsborough County composite locator (no key; CORS allowed). Hansika.
// See prep/03-drainage-roads-live-data.md section E1. Names and types as in docs/contracts.md.
import { loadGold } from "@/lib/data";
import type { AddressMatch, AddressSuggestion, LngLat, Manifest } from "@/lib/types";

const LOCATOR =
  "https://maps.hillsboroughcounty.org/arcgis/rest/services/Geocoding/Composite_Address_Locator_Overall/GeocodeServer";

/**
 * A suggestion id carries both the locator's magicKey and the suggestion text, joined by "|":
 * findAddressCandidates returns no candidates for a magicKey without its SingleLine text (checked 2026-11-21).
 */
const SEP = "|";

interface SuggestResponse {
  suggestions?: { text: string; magicKey: string; isCollection?: boolean }[];
  error?: { message?: string };
}
interface Candidate {
  address: string;
  location: { x: number; y: number };
  score: number;
}
interface CandidatesResponse {
  candidates?: Candidate[];
  error?: { message?: string };
}

async function callLocator<T extends { error?: { message?: string } }>(what: string, url: URL): Promise<T> {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`County ${what} failed (HTTP ${res.status})`);
  const body = (await res.json()) as T;
  if (body.error) throw new Error(`County ${what} failed: ${body.error.message ?? "unknown error"}`);
  return body;
}

export async function suggestAddresses(text: string): Promise<AddressSuggestion[]> {
  const q = text.trim();
  if (!q) return [];
  const url = new URL(`${LOCATOR}/suggest`);
  url.searchParams.set("text", q);
  url.searchParams.set("f", "json");
  const body = await callLocator<SuggestResponse>("address suggest", url);
  return (body.suggestions ?? [])
    .filter((s) => !s.isCollection)
    .map((s) => ({ id: `${s.magicKey}${SEP}${s.text}`, label: s.text }));
}

function insideBox(manifest: Manifest, [lng, lat]: LngLat): boolean {
  const [west, south, east, north] = manifest.bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export async function resolveAddress(suggestionId: string): Promise<AddressMatch | null> {
  const cut = suggestionId.indexOf(SEP);
  const magicKey = cut < 0 ? suggestionId : suggestionId.slice(0, cut);
  const text = cut < 0 ? "" : suggestionId.slice(cut + 1);
  const url = new URL(`${LOCATOR}/findAddressCandidates`);
  if (text) url.searchParams.set("SingleLine", text);
  url.searchParams.set("magicKey", magicKey);
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("maxLocations", "5");
  url.searchParams.set("f", "json");
  const [body, gold] = await Promise.all([callLocator<CandidatesResponse>("address lookup", url), loadGold()]);
  const best = (body.candidates ?? []).reduce<Candidate | null>((top, c) => (top === null || c.score > top.score ? c : top), null);
  if (!best) return null;
  const position: LngLat = [best.location.x, best.location.y];
  return { label: best.address, position, inside: insideBox(gold.manifest, position) };
}
