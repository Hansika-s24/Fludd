// Better options nearby (Hansika). Real-estate extra; name and types as in docs/contracts.md.
// Similar homes within a mile whose flood grade is strictly better than the grade at the given position.
// Each candidate is graded with the same letter rule as the card (lib/grade letterFromDepths), from the
// per-storm building depths in parcels.json: pump on for the base letter, pump off for the pump notch,
// floor notch and evidence caps as usual. The fire-station (routing) notch is skipped for candidates.
import { cellIndex, loadGold, loadParcels, type Parcel } from "@/lib/data";
import { compareLetters, distanceM, gradeFor, letterFromDepths, STORMS, type Storm } from "@/lib/grade";
import type { BetterOption, Letter, LngLat } from "@/lib/types";

/** A home within this distance of the position is the reference home. */
export const REFERENCE_HOME_M = 60;
/** With no reference home, the price band centres on the median value of homes within this distance. */
export const MEDIAN_RADIUS_M = 300;
/** Candidates within this distance (about a mile). */
export const SEARCH_RADIUS_M = 1600;
/** Assessed value within this fraction of the reference value. */
export const PRICE_BAND = 0.2;
/** Beds within this many of the reference home's beds (not applied to VACANT RESIDENT or without a reference home). */
export const BEDS_BAND = 1;
export const MAX_OPTIONS = 10;
const NO_BEDS_RULE = "VACANT RESIDENT";

/** The letter for one home from its parcels.json depths and evidence flags (no routing notch). */
export function parcelLetter(p: Parcel): Letter {
  const depths = (pump: "on" | "off") =>
    Object.fromEntries(STORMS.map((s) => [s, p.peakDepthM[`${s}-${pump}`] ?? 0])) as Record<Storm, number>;
  return letterFromDepths({
    peakOn: depths("on"),
    peakOff: depths("off"),
    femaHighRisk: p.femaHighRisk,
    femaShadedX: p.femaShadedX,
    miltonDamageWithin100m: p.miltonPointWithin100m,
    cutOffFromEveryFireStation: null,
  }).letter;
}

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Up to 10 similar homes within 1,600 m with a strictly better grade than `position`, best letter first,
 * then nearest. Similar = same property type, assessed value within 20%, beds within 1, taken from the
 * nearest home within 60 m; with no home that close, any residential type within 20% of the median value
 * of homes within 300 m. Outside the validated area: [].
 */
export async function findBetterOptions(position: LngLat): Promise<BetterOption[]> {
  const gold = await loadGold();
  if (cellIndex(gold.manifest, position) === null) return [];
  const [parcels, here] = await Promise.all([loadParcels(), gradeFor(position)]);
  if (here.kind !== "ok") return [];

  const withDistance = parcels.map((p) => ({ p, d: distanceM(position, p.position) }));
  let reference: Parcel | null = null;
  let nearest = REFERENCE_HOME_M;
  for (const { p, d } of withDistance) {
    if (d <= nearest) {
      reference = p;
      nearest = d;
    }
  }

  let refValue: number;
  if (reference) {
    refValue = reference.assessedValue;
  } else {
    const around = withDistance.filter(({ d }) => d <= MEDIAN_RADIUS_M).map(({ p }) => p.assessedValue);
    if (around.length === 0) return [];
    refValue = median(around);
  }
  const ref = reference;
  const similar = (p: Parcel): boolean => {
    if (Math.abs(p.assessedValue - refValue) > PRICE_BAND * refValue) return false;
    if (!ref) return true;
    if (p.propertyType !== ref.propertyType) return false;
    return ref.propertyType === NO_BEDS_RULE || Math.abs(p.beds - ref.beds) <= BEDS_BAND;
  };

  const options: BetterOption[] = [];
  for (const { p, d } of withDistance) {
    if (d > SEARCH_RADIUS_M || p === ref || !similar(p)) continue;
    const grade = parcelLetter(p);
    if (compareLetters(grade, here.letter) >= 0) continue;
    options.push({
      address: p.address,
      position: p.position,
      assessedValue: p.assessedValue,
      beds: p.beds,
      baths: p.baths,
      livingAreaSqft: p.livingAreaSqft,
      propertyType: p.propertyType,
      grade,
      distanceM: Math.round(d),
    });
  }
  options.sort((a, b) => compareLetters(a.grade, b.grade) || a.distanceM - b.distanceM);
  return options.slice(0, MAX_OPTIONS);
}
