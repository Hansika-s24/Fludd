// Flood report card grade (Hansika). Rules: prep/PLAN.md section 6 and prep/04-depth-model-and-routing.md section 5.
// The letter says how often water is expected to reach the building; notches and caps can only lower it.
import {
  cellIndex, loadGold, loadLayer, loadLevels, loadLevelsVariant, peakBuildingDepth, type RainVariant,
} from "@/lib/data";
import type { DepthBand, Grade, GradeReason, GradeResult, Letter, Levels, LngLat, Scenario } from "@/lib/types";

const LETTERS: Letter[] = ["A", "B", "C", "D", "F"];
/** The four storms that decide the base letter, smallest first. */
export const STORMS = ["10yr", "25yr", "100yr", "500yr"] as const;
export type Storm = (typeof STORMS)[number];
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
  /**
   * Peak depth at the building (pump on) with rainfall at the low and high ends of NOAA Atlas 14's 90%
   * confidence interval. Absent or null (variant files missing): range is [letter, letter], lowConfidence false.
   */
  rainVariants?: { low: Record<Storm, number>; high: Record<Storm, number> } | null;
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
const better = (a: Letter, b: Letter): Letter => (LETTERS.indexOf(a) <= LETTERS.indexOf(b) ? a : b);
/** Negative when a is the better letter; sorts best first. */
export const compareLetters = (a: Letter, b: Letter): number => LETTERS.indexOf(a) - LETTERS.indexOf(b);

const ACTIONS: Partial<Record<Letter, string>> = {
  C: "Keep sandbags and a go-bag ready. When a big storm is forecast, move your car to higher ground before the rain peaks.",
  D: "Before heavy rain, move your car to higher ground, lift valuables off the floor and plan a way out that avoids low roads. Never drive or walk into floodwater.",
  F: "Water reaches this building in common storms. Move your car and valuables up before heavy rain, leave early when a storm is forecast, and never drive or walk into floodwater.",
};

/** Evidence flags for the caps and the routing notch. */
export interface LetterEvidence {
  femaHighRisk: boolean;
  femaShadedX: boolean;
  /** FEMA zone code for the cap text, e.g. "AE"; "" or absent prints "SFHA" */
  femaZone?: string;
  miltonDamageWithin100m: boolean;
  /** null = not computed, no notch (skipped when grading many homes) */
  cutOffFromEveryFireStation: boolean | null;
}

/** Everything the letter needs: peak building depth per graded storm, plus evidence. */
export interface LetterInput extends LetterEvidence {
  /** Peak depth at the building, pump on, metres */
  peakOn: Record<Storm, number>;
  /** Same with the pump off; null skips the pump notch */
  peakOff: Record<Storm, number> | null;
}

export interface LetterResult {
  letter: Letter;
  /** Base letter before notches and caps */
  base: Letter;
  /** Smallest storm that wets the building (pump on), or null if none */
  firstWet: Storm | null;
  /** Texts of the notches that applied (at most two) */
  notches: string[];
  /** base, then notches, then the caps that lowered the letter */
  reasons: GradeReason[];
}

const wet = (m: number) => m >= WET_M;

/** Base letter: the smallest storm (pump on) that wets the building. */
export function baseLetter(peakOn: Record<Storm, number>): { letter: Letter; firstWet: Storm | null; reason: GradeReason } {
  const firstWet = STORMS.find((s) => wet(peakOn[s])) ?? null;
  if (firstWet === "10yr") {
    return { letter: "F", firstWet, reason: { kind: "base", text: "F: water of 6 in or more reaches the building in a 10-year storm" } };
  }
  if (firstWet === null) {
    return { letter: "A", firstWet, reason: { kind: "base", text: "A: the building stays dry (under 6 in) even in a 500-year storm" } };
  }
  const i = STORMS.indexOf(firstWet);
  const letter = (["F", "D", "C", "B"] as const)[i];
  return {
    letter, firstWet,
    reason: {
      kind: "base",
      text: `${letter}: dry at the building in a ${STORM_WORDS[STORMS[i - 1]]} storm, 6 in or more in a ${STORM_WORDS[firstWet]} storm`,
    },
  };
}

/** Notch texts that apply, at most two, in order: pump, floor, fire stations. */
function notchesFor(input: LetterInput): string[] {
  const notches: string[] = [];
  const off = input.peakOff;
  const pumpStorm = off ? STORMS.find((s) => wet(off[s]) && !wet(input.peakOn[s])) : undefined;
  if (pumpStorm) {
    notches.push(`One letter down: in a ${STORM_WORDS[pumpStorm]} storm the building stays dry only while the pump runs`);
  }
  if (input.peakOn["100yr"] > FLOOR_M) {
    notches.push("One letter down: in a 100-year storm water at the building is deep enough to come in over the floor");
  }
  // HOOK: isolation notch. lib/routing fills cutOffFromEveryFireStation once rescueReach exists.
  if (input.cutOffFromEveryFireStation === true) {
    notches.push("One letter down: flooded roads cut the address off from every fire station");
  }
  return notches.slice(0, MAX_NOTCHES);
}

/** Lowers a base letter by each notch, then applies the evidence caps (each listed only when it lowers the letter). */
function applyNotchesAndCaps(base: Letter, notches: string[], ev: LetterEvidence): { letter: Letter; reasons: GradeReason[] } {
  let letter = base;
  const reasons: GradeReason[] = [];
  for (const text of notches) {
    letter = down(letter);
    reasons.push({ kind: "notch", text });
  }
  const caps: [Letter, string][] = [];
  if (ev.miltonDamageWithin100m) caps.push(["C", "No better than C: Hurricane Milton flood damage was recorded within 100 m"]);
  if (ev.femaHighRisk) caps.push(["C", `No better than C: FEMA maps this spot as a high-risk flood zone (${ev.femaZone || "SFHA"})`]);
  if (ev.femaShadedX) caps.push(["B", "No better than B: FEMA maps this spot as shaded Zone X (0.2% annual chance)"]);
  for (const [cap, text] of caps) {
    if (worse(letter, cap) !== letter) {
      letter = cap;
      reasons.push({ kind: "cap", text });
    }
  }
  return { letter, reasons };
}

/** The letter rule (base, notches, caps) as a pure function of per-storm building depths and evidence flags. */
export function letterFromDepths(input: LetterInput): LetterResult {
  const base = baseLetter(input.peakOn);
  const notches = notchesFor(input);
  const after = applyNotchesAndCaps(base.letter, notches, input);
  return { letter: after.letter, base: base.letter, firstWet: base.firstWet, notches, reasons: [base.reason, ...after.reasons] };
}

/**
 * Grade range from the rainfall variants: the base letter from the low-rain depths (best) and the high-rain
 * depths (worst), each with the central grade's notches and caps applied. The range always contains the
 * central letter. lowConfidence: the range spans three letters or more. No variants: [letter, letter], false.
 */
export function rangeFromVariants(
  central: LetterResult,
  evidence: LetterEvidence,
  variants: { low: Record<Storm, number>; high: Record<Storm, number> } | null | undefined,
): { range: [best: Letter, worst: Letter]; lowConfidence: boolean } {
  if (!variants) return { range: [central.letter, central.letter], lowConfidence: false };
  const at = (on: Record<Storm, number>) => applyNotchesAndCaps(baseLetter(on).letter, central.notches, evidence).letter;
  const best = better(at(variants.low), central.letter);
  const worst = worse(at(variants.high), central.letter);
  return { range: [best, worst], lowConfidence: compareLetters(worst, best) >= 2 };
}

export function gradeFromFacts(f: GradeFacts): Grade {
  const fema = f.femaProps ? femaZoneOf(f.femaProps) : null;
  const evidence: LetterEvidence = {
    femaHighRisk: fema?.risk === "high",
    femaShadedX: fema?.risk === "shaded_x",
    femaZone: fema?.zone ?? "",
    miltonDamageWithin100m: f.miltonDamageWithin100m,
    cutOffFromEveryFireStation: f.cutOffFromEveryFireStation,
  };
  const result = letterFromDepths({ ...evidence, peakOn: f.peakOn, peakOff: f.peakOff });
  const { letter, firstWet } = result;
  const { range, lowConfidence } = rangeFromVariants(result, evidence, f.rainVariants);

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
    range,
    lowConfidence,
    reasons: result.reasons,
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
  /** Pump-on peaks for one rain variant, or null when any of its files is missing. */
  const variantPeaks = async (v: RainVariant): Promise<Record<Storm, number> | null> => {
    const files = await Promise.all(STORMS.map((s) => loadLevelsVariant(s, v)));
    if (files.some((l) => l === null)) return null;
    const [d10, d25, d100, d500] = files.map((l) => {
      const d = peakBuildingDepth(gold, l as Levels, position);
      return d.kind === "ok" ? d.depthM : 0;
    });
    return { "10yr": d10, "25yr": d25, "100yr": d100, "500yr": d500 };
  };
  const [on10, on25, on100, on500, onMilton, off10, off25, off100, off500, fema, milton, low, high] = await Promise.all([
    peak("10yr", "on"), peak("25yr", "on"), peak("100yr", "on"), peak("500yr", "on"), peak("milton", "on"),
    peak("10yr", "off"), peak("25yr", "off"), peak("100yr", "off"), peak("500yr", "off"),
    loadLayer("fema-zones"), loadLayer("milton-damage"), variantPeaks("low"), variantPeaks("high"),
  ]);
  return gradeFromFacts({
    peakOn: { "10yr": on10, "25yr": on25, "100yr": on100, "500yr": on500, milton: onMilton },
    peakOff: { "10yr": off10, "25yr": off25, "100yr": off100, "500yr": off500 },
    ...evidenceAt(position, fema, milton),
    cutOffFromEveryFireStation: null, // HOOK: set from lib/routing rescueReach when routing exists
    rainVariants: low && high ? { low, high } : null,
  });
}
