// Flood report card grade (Hansika). Rules: prep/PLAN.md section 6 and prep/04-depth-model-and-routing.md section 5.
// The letter says how often water is expected to reach the building; notches and caps can only lower it.
import { cellIndex, loadGold, loadLayer, loadLevels, peakBuildingDepth } from "@/lib/data";
import type { DepthBand, Grade, GradeReason, GradeResult, Letter, LngLat, Scenario } from "@/lib/types";

const LETTERS: Letter[] = ["A", "B", "C", "D", "F"];
/** The four storms that decide the base letter, smallest first. */
const STORMS = ["10yr", "25yr", "100yr", "500yr"] as const;
type Storm = (typeof STORMS)[number];
const STORM_WORDS: Record<Scenario, string> = {
  "10yr": "10-year", "25yr": "25-year", "100yr": "100-year", "500yr": "500-year", milton: "Milton",
};

/** "Wet" = depth at the building of 0.15 m (6 in) or more (PLAN.md section 6). */
export const WET_M = 0.15;
/**
 * Floor notch: more than 0.30 m at the building in the 100-year storm.
 * OUR ASSUMPTION: 0.30 m (about 1 ft) stands in for "deep enough to enter the floor", from the Hazus default
 * first-floor height of 1 ft for slab foundations (04, section 3). Real floor heights are unknown.
 */
export const FLOOR_M = 0.3;
/** Milton cap: a Milton flood-damage point within this distance. */
export const MILTON_CAP_M = 100;
const MAX_NOTCHES = 2;

/** Everything the grade needs, so the rule itself is a pure function. */
export interface GradeFacts {
  /** Peak depth at the building over the storm's hours, pump on, metres */
  peakOn: Record<Scenario, number>;
  /** Same with the pump off, for the four graded storms */
  peakOff: Record<Storm, number>;
  /** Properties of the FEMA zone polygon at the address (highest risk if several), or null if none */
  femaProps: Record<string, unknown> | null;
  miltonDamageWithin100m: boolean;
  /**
   * HOOK (deferred until lib/routing exists): true when the address is cut off from every fire station.
   * null = not computed yet, and no notch is applied.
   */
  cutOffFromEveryFireStation: boolean | null;
}

// ---------- FEMA zone ----------

type FemaRisk = "high" | "shaded_x" | "x" | "other";
interface FemaZone { risk: FemaRisk; zone: string; label: string }

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Reads FLD_ZONE / SFHA_TF / ZONE_SUBTY (FEMA NFHL fields); falls back to `zone` as in the toy fixture. */
export function femaZoneOf(props: Record<string, unknown>): FemaZone {
  const zone = (str(props.FLD_ZONE) || str(props.zone)).toUpperCase();
  const sfha = str(props.SFHA_TF).toUpperCase() === "T";
  const subtype = str(props.ZONE_SUBTY).toUpperCase();
  if (sfha || zone.startsWith("A") || zone.startsWith("V")) {
    return { risk: "high", zone, label: `${zone ? `Zone ${zone}` : "Special flood hazard area"}, high-risk flood area (1% annual chance)` };
  }
  if (zone === "X" && subtype.includes("0.2 PCT")) {
    return { risk: "shaded_x", zone, label: "Shaded Zone X, moderate flood hazard (0.2% annual chance)" };
  }
  if (zone === "X") return { risk: "x", zone, label: "Zone X, minimal flood hazard" };
  if (zone === "D") return { risk: "other", zone, label: "Zone D, flood hazard not determined" };
  return { risk: "other", zone, label: zone ? `Zone ${zone}` : "Not on the FEMA flood map" };
}

const RISK_ORDER: FemaRisk[] = ["other", "x", "shaded_x", "high"];

// ---------- geometry ----------

/** Great-circle distance in metres (haversine, mean Earth radius). */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(a));
}

function inRing([x, y]: LngLat, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolygon(p: LngLat, rings: GeoJSON.Position[][]): boolean {
  return rings.length > 0 && inRing(p, rings[0]) && !rings.slice(1).some((hole) => inRing(p, hole));
}
function contains(geometry: GeoJSON.Geometry | null, p: LngLat): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return inPolygon(p, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((poly) => inPolygon(p, poly));
  return false;
}
function points(geometry: GeoJSON.Geometry | null): LngLat[] {
  if (!geometry) return [];
  if (geometry.type === "Point") return [[geometry.coordinates[0], geometry.coordinates[1]]];
  if (geometry.type === "MultiPoint") return geometry.coordinates.map((c) => [c[0], c[1]]);
  return [];
}

/** The evidence for the caps at a position: FEMA zone properties and Milton damage nearby. */
export function evidenceAt(
  position: LngLat, femaZones: GeoJSON.FeatureCollection, miltonDamage: GeoJSON.FeatureCollection,
): Pick<GradeFacts, "femaProps" | "miltonDamageWithin100m"> {
  let femaProps: Record<string, unknown> | null = null;
  for (const f of femaZones.features) {
    if (!contains(f.geometry, position)) continue;
    const props = f.properties ?? {};
    if (femaProps === null || RISK_ORDER.indexOf(femaZoneOf(props).risk) > RISK_ORDER.indexOf(femaZoneOf(femaProps).risk)) {
      femaProps = props;
    }
  }
  const miltonDamageWithin100m = miltonDamage.features.some((f) =>
    points(f.geometry).some((p) => distanceM(position, p) <= MILTON_CAP_M));
  return { femaProps, miltonDamageWithin100m };
}

// ---------- the rule ----------

export function depthBand(m: number): DepthBand {
  if (m <= 0) return "none";
  if (m < 0.15) return "under_6in";
  if (m < 0.3) return "6_12in";
  if (m < 0.61) return "1_2ft";
  return "over_2ft";
}
const BAND_WORDS: Record<DepthBand, string> = {
  none: "no water", under_6in: "under 6 in", "6_12in": "6 to 12 in", "1_2ft": "1 to 2 ft", over_2ft: "over 2 ft",
};

const down = (l: Letter, steps = 1): Letter => LETTERS[Math.min(LETTERS.length - 1, LETTERS.indexOf(l) + steps)];
const worse = (a: Letter, b: Letter): Letter => (LETTERS.indexOf(a) >= LETTERS.indexOf(b) ? a : b);

const ACTIONS: Partial<Record<Letter, string>> = {
  C: "Keep sandbags and a go-bag ready. When a big storm is forecast, move your car to higher ground before the rain peaks.",
  D: "Before heavy rain, move your car to higher ground, lift valuables off the floor and plan a way out that avoids low roads. Never drive or walk into floodwater.",
  F: "Water reaches this building in common storms. Move your car and valuables up before heavy rain, leave early when a storm is forecast, and never drive or walk into floodwater.",
};

export function gradeFromFacts(f: GradeFacts): Grade {
  const wet = (m: number) => m >= WET_M;
  const reasons: GradeReason[] = [];

  // Base letter: the smallest storm that wets the building.
  const firstWet = STORMS.find((s) => wet(f.peakOn[s]));
  let letter: Letter;
  if (firstWet === "10yr") {
    letter = "F";
    reasons.push({ kind: "base", text: "F: water of 6 in or more reaches the building in a 10-year storm" });
  } else if (firstWet === undefined) {
    letter = "A";
    reasons.push({ kind: "base", text: "A: the building stays dry (under 6 in) even in a 500-year storm" });
  } else {
    const i = STORMS.indexOf(firstWet);
    letter = (["F", "D", "C", "B"] as const)[i];
    reasons.push({
      kind: "base",
      text: `${letter}: dry at the building in a ${STORM_WORDS[STORMS[i - 1]]} storm, 6 in or more in a ${STORM_WORDS[firstWet]} storm`,
    });
  }

  // Notches: one letter each, at most two.
  const notches: string[] = [];
  const pumpStorm = STORMS.find((s) => wet(f.peakOff[s]) && !wet(f.peakOn[s]));
  if (pumpStorm) {
    notches.push(`One letter down: in a ${STORM_WORDS[pumpStorm]} storm the building stays dry only while the pump runs`);
  }
  if (f.peakOn["100yr"] > FLOOR_M) {
    notches.push("One letter down: in a 100-year storm water at the building is deep enough to come in over the floor");
  }
  // HOOK: isolation notch. lib/routing fills cutOffFromEveryFireStation once rescueReach exists.
  if (f.cutOffFromEveryFireStation === true) {
    notches.push("One letter down: flooded roads cut the address off from every fire station");
  }
  for (const text of notches.slice(0, MAX_NOTCHES)) {
    letter = down(letter);
    reasons.push({ kind: "notch", text });
  }

  // Caps from evidence: no better than the cap letter. Listed only when they lower the grade.
  const fema = f.femaProps ? femaZoneOf(f.femaProps) : null;
  const caps: [Letter, string][] = [];
  if (f.miltonDamageWithin100m) caps.push(["C", "No better than C: Hurricane Milton flood damage was recorded within 100 m"]);
  if (fema?.risk === "high") caps.push(["C", `No better than C: FEMA maps this spot as a high-risk flood zone (${fema.zone || "SFHA"})`]);
  if (fema?.risk === "shaded_x") caps.push(["B", "No better than B: FEMA maps this spot as shaded Zone X (0.2% annual chance)"]);
  for (const [cap, text] of caps) {
    if (worse(letter, cap) !== letter) {
      letter = cap;
      reasons.push({ kind: "cap", text });
    }
  }

  const depthByStorm = {
    "10yr": depthBand(f.peakOn["10yr"]), "25yr": depthBand(f.peakOn["25yr"]), "100yr": depthBand(f.peakOn["100yr"]),
    "500yr": depthBand(f.peakOn["500yr"]), milton: depthBand(f.peakOn.milton),
  };
  const weFound = firstWet
    ? `Water reaches ${BAND_WORDS[depthByStorm[firstWet]]} at the building in a ${STORM_WORDS[firstWet]} storm`
    : depthByStorm["500yr"] === "none"
      ? "No water reaches the building even in a 500-year storm"
      : "Water stays under 6 in at the building even in a 500-year storm";

  return {
    kind: "ok",
    letter,
    // Low and high rainfall variants do not exist yet (contracts decision 5).
    range: [letter, letter],
    lowConfidence: false,
    reasons,
    depthByStorm,
    officialMapSays: fema ? fema.label : "Not on the FEMA flood map",
    weFound,
    action: ACTIONS[letter] ?? null,
  };
}

// ---------- the contract function ----------

export async function gradeFor(position: LngLat): Promise<GradeResult> {
  const gold = await loadGold();
  if (cellIndex(gold.manifest, position) === null) return { kind: "outside" };

  const peak = async (s: Scenario, pump: "on" | "off"): Promise<number> => {
    const d = peakBuildingDepth(gold, await loadLevels(s, pump), position);
    return d.kind === "ok" ? d.depthM : 0;
  };
  const [on10, on25, on100, on500, onMilton, off10, off25, off100, off500, fema, milton] = await Promise.all([
    peak("10yr", "on"), peak("25yr", "on"), peak("100yr", "on"), peak("500yr", "on"), peak("milton", "on"),
    peak("10yr", "off"), peak("25yr", "off"), peak("100yr", "off"), peak("500yr", "off"),
    loadLayer("fema-zones"), loadLayer("milton-damage"),
  ]);
  return gradeFromFacts({
    peakOn: { "10yr": on10, "25yr": on25, "100yr": on100, "500yr": on500, milton: onMilton },
    peakOff: { "10yr": off10, "25yr": off25, "100yr": off100, "500yr": off500 },
    ...evidenceAt(position, fema, milton),
    cutOffFromEveryFireStation: null, // HOOK: set from lib/routing rescueReach when routing exists
  });
}
