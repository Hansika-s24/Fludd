import { STORM_WORDS } from "@/components/ui/storm-words";
import { SCENARIOS, type Grade, type Scenario } from "@/lib/types";

const BY_YEARS: Record<string, Scenario> = { "10": "10yr", "25": "25yr", "100": "100yr", "500": "500yr" };

/**
 * The grade logic names storms by return period ("a 500-year storm"). People read that as "not for another 500
 * years", so the screen says what the storm is instead, in the same words as the storm picker.
 */
export function plainStorms(text: string): string {
  return text.replace(/\b(?:an? )?(10|25|100|500)-year storm\b/g, (_, years: string) => {
    const name = STORM_WORDS[BY_YEARS[years]].name;
    return name.charAt(0).toLowerCase() + name.slice(1);
  });
}

/**
 * The heading over "Official map says / We found". It only claims the flood map is missing something when it
 * is: the official map calls the spot minimal risk and the model puts 6 in or more of water at the building.
 * When the two say the same thing, it says so.
 */
export function mapVerdictTitle(grade: Pick<Grade, "officialMapSays" | "depthByStorm">): string {
  const wet = SCENARIOS.some((s) => !["none", "under_6in"].includes(grade.depthByStorm[s]));
  // The contract gives the official line as words only, so the zone is read back from them.
  const official = /high-risk/i.test(grade.officialMapSays) ? "high" : /minimal/i.test(grade.officialMapSays) ? "minimal" : "other";
  if (official === "minimal" && wet) return "What the flood map doesn't tell you";
  if (official === "minimal" && !wet) return "Our model agrees with the flood map";
  if (official === "high" && wet) return "Our model agrees with the flood map";
  return "The flood map and our model";
}
