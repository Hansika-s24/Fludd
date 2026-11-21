"use client";

import { useEffect, useState } from "react";
import { Group } from "@/components/ui/surface";
import type { LngLat } from "@/lib/types";

const OVERPASS = "https://overpass-api.de/api/interpreter";
/** How far to look for food and shelter: about 6 miles. */
const RADIUS_M = 10_000;

interface Place {
  name: string;
  kind: string;
  distanceM: number;
  position: LngLat;
}

const KIND_WORDS: Record<string, string> = {
  food_bank: "Food bank",
  soup_kitchen: "Free meals",
  shelter: "Shelter",
  community_centre: "Community centre",
  social_facility: "Social services",
  place_of_worship: "Place of worship",
};

function metres([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const r = Math.PI / 180;
  const x = (lng2 - lng1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/** Food banks, free meals, shelters and community centres near a point, from OpenStreetMap. */
async function nearbyHelp([lng, lat]: LngLat): Promise<Place[]> {
  const around = `(around:${RADIUS_M},${lat},${lng})`;
  const q = `[out:json][timeout:8];(
    nwr${around}["amenity"~"^(food_bank|social_facility|shelter|community_centre)$"]["name"];
    nwr${around}["social_facility"~"^(food_bank|soup_kitchen|shelter)$"]["name"];
  );out center 40;`;
  const res = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Map data answered ${res.status}`);
  const body = (await res.json()) as { elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
  const seen = new Set<string>();
  return (body.elements ?? [])
    .map((e) => {
      const p: LngLat | null = e.lat !== undefined && e.lon !== undefined ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : null;
      const t = e.tags ?? {};
      const kind = t.social_facility && KIND_WORDS[t.social_facility] ? t.social_facility : t.amenity ?? "social_facility";
      return p && t.name ? { name: t.name, kind, position: p, distanceM: metres([lng, lat], p) } : null;
    })
    .filter((p): p is Place => p !== null && !seen.has(p.name) && (seen.add(p.name), true))
    // Food first, then shelters, then the rest; nearest first within each.
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.distanceM - b.distanceM)
    .slice(0, 8);
}

function rank(kind: string): number {
  return kind === "food_bank" || kind === "soup_kitchen" ? 0 : kind === "shelter" ? 1 : 2;
}

const miles = (m: number) => `${(m / 1609.34).toFixed(1)} mi`;

/** Where to get food, water and a dry place during a flood, and who to call. */
export function HelpPanel({ position }: { position: LngLat }) {
  const key = position.join(",");
  const [state, setState] = useState<{ key: string; places: Place[] | null; failed: boolean } | null>(null);

  useEffect(() => {
    let stale = false;
    nearbyHelp(position).then(
      (places) => !stale && setState({ key, places, failed: false }),
      () => !stale && setState({ key, places: null, failed: true }),
    );
    return () => {
      stale = true;
    };
    // key stands for position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const now = state?.key === key ? state : null;

  return (
    <>
      <Group title="Food, water and shelter nearby">
        {!now ? (
          <div className="space-y-2 px-4 py-3" aria-busy>
            <div className="shimmer h-5 w-3/4 rounded-md" />
            <div className="shimmer h-5 w-2/3 rounded-md" />
            <div className="shimmer h-5 w-1/2 rounded-md" />
          </div>
        ) : now.failed || !now.places?.length ? (
          <p className="px-4 py-3 text-subhead text-label-2">
            {now.failed ? "Map data is busy right now. Call 211 for food and shelter." : "No food banks or shelters are mapped near here. Call 211."}
          </p>
        ) : (
          now.places.map((p, i, all) => (
            <a
              key={p.name}
              href={`https://maps.apple.com/?daddr=${p.position[1]},${p.position[0]}&dirflg=d`}
              target="_blank"
              rel="noreferrer"
              style={{ ["--i" as string]: i }}
              className={`rise-in pressable flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 ${i < all.length - 1 ? "border-b border-separator" : ""}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-body">{p.name}</span>
                <span className="block text-footnote text-label-2">{KIND_WORDS[p.kind] ?? "Help"}</span>
              </span>
              <span className="shrink-0 text-subhead tabular-nums text-label-2">{miles(p.distanceM)}</span>
            </a>
          ))
        )}
      </Group>
      <p className="px-5 pt-2 text-footnote text-label-3">
        From OpenStreetMap. Hours change in a storm: call before you go, and never drive into floodwater to get there.
      </p>

      <Group title="Call for help">
        <a href="tel:911" className="pressable flex min-h-14 items-center justify-between gap-3 border-b border-separator px-4 py-2.5">
          <span><span className="block text-body font-semibold text-late">911</span><span className="block text-footnote text-label-2">Water rising inside, or someone in danger</span></span>
        </a>
        <a href="tel:211" className="pressable flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
          <span><span className="block text-body font-semibold">211</span><span className="block text-footnote text-label-2">Food, shelter, and storm help across Tampa Bay, any hour</span></span>
        </a>
      </Group>

      <Group title="Restaurants and stores giving food">
        <p className="px-4 py-3 text-subhead text-label-2">
          Coming next: businesses that hand out food or water during a flood will be able to list themselves here, checked by a person before
          they appear, so neighbours in need can find them.
        </p>
      </Group>
    </>
  );
}
