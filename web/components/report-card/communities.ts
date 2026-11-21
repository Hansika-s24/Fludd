import { DATA_BASE } from "@/lib/config";
import type { AddressMatch, AddressSuggestion, LngLat } from "@/lib/types";

/**
 * Search by community name ("Campus Palms", "42 North"). People know where they live by its name, and the
 * address geocoders mostly do not. The names come from OpenStreetMap, fetched once by
 * pipeline/ingest/communities.py and searched here in the browser, so a match is instant and needs no network.
 */
interface Community {
  name: string;
  position: LngLat;
}

/** Ids made here start with this, so a pick is resolved from the id itself with no second request. */
const PREFIX = "c:";
const MAX = 4;
/** Words people add or drop freely; they do not decide a match. */
const FILLER = new Set(["the", "at", "on", "apartment", "apartments", "apts", "apt", "condo", "condos", "condominium", "condominiums"]);

let cache: Promise<Community[]> | null = null;
function load(): Promise<Community[]> {
  // The toy data set ships no community file: that is an empty list, not an error.
  cache ??= fetch(`${DATA_BASE}/communities.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Community[]>) : []))
    .catch(() => []);
  return cache;
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Pure matcher: every meaningful word typed must start a word of the name. Names that start with the text come first. */
export function matchCommunities(text: string, all: Community[]): AddressSuggestion[] {
  const typed = words(text).filter((w) => !FILLER.has(w));
  if (typed.length === 0 || typed.join("").length < 2) return [];
  const first = typed[0];
  return all
    .filter((c) => {
      const name = words(c.name);
      return typed.every((t) => name.some((n) => n.startsWith(t)));
    })
    .sort((a, b) => Number(words(b.name)[0]?.startsWith(first)) - Number(words(a.name)[0]?.startsWith(first)) || a.name.localeCompare(b.name))
    .slice(0, MAX)
    .map((c) => ({ id: `${PREFIX}${c.position[0]},${c.position[1]}|${c.name}`, label: c.name }));
}

export async function suggestCommunities(text: string): Promise<AddressSuggestion[]> {
  return matchCommunities(text, await load());
}

/** The place for a community suggestion, or null when the id is not one of ours. */
export function resolveCommunity(id: string): AddressMatch | null {
  if (!id.startsWith(PREFIX)) return null;
  const cut = id.indexOf("|");
  const [lng, lat] = id.slice(PREFIX.length, cut).split(",").map(Number);
  if (cut < 0 || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  // Every community in the file was fetched from inside the study box.
  return { label: id.slice(cut + 1), position: [lng, lat], inside: true };
}
