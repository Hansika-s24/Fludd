import { STORM_WORDS } from "@/components/ui/storm-words";
import type { DepthBand, Grade, Scenario } from "@/lib/types";

/** What the person is deciding about this address. */
export type Lens = "buying" | "renting" | "building";
export type Level = "good" | "watch" | "act";
export interface CheckItem {
  title: string;
  level: Level;
  /** What the report found, in one sentence. */
  finding: string;
  /** What to do about it before signing or designing. */
  todo: string;
}

const DESIGN_STORMS: Scenario[] = ["10yr", "25yr", "100yr", "500yr"];
const WET: DepthBand[] = ["6_12in", "1_2ft", "over_2ft"];
const BAND: Record<DepthBand, string> = { none: "no water", under_6in: "under 6 in", "6_12in": "6 to 12 in", "1_2ft": "1 to 2 ft", over_2ft: "over 2 ft" };
const FLOOR_ABOVE: Record<DepthBand, string> = { none: "", under_6in: "", "6_12in": "above 12 in", "1_2ft": "above 2 ft", over_2ft: "well above 2 ft" };

const storm = (s: Scenario) => STORM_WORDS[s].name.charAt(0).toLowerCase() + STORM_WORDS[s].name.slice(1);

/**
 * Turns one address's report into a short checklist for someone buying, renting or building there.
 * Every line comes from the grade already on screen: no new numbers, and nothing here says a place is safe to
 * buy. The two disclosure rules are Florida Statutes 689.302 (sales) and 83.512 (leases of a year or longer).
 */
export function checklist(lens: Lens, grade: Pick<Grade, "letter" | "depthByStorm" | "officialMapSays" | "reasons">): CheckItem[] {
  const firstWet = DESIGN_STORMS.find((s) => WET.includes(grade.depthByStorm[s])) ?? null;
  // The contract gives the official line and the reasons as words only, so the flags are read back from them.
  const highRisk = /high-risk/i.test(grade.officialMapSays);
  const miltonNearby = grade.reasons.some((r) => r.kind === "cap" && /milton/i.test(r.text));
  const pump = grade.reasons.some((r) => /pump/i.test(r.text));
  const miltonWet = WET.includes(grade.depthByStorm.milton);
  const items: CheckItem[] = [];

  // 1. Water at the building.
  if (firstWet) {
    const band = grade.depthByStorm[firstWet];
    items.push({
      title: "Water at the building",
      level: firstWet === "10yr" || firstWet === "25yr" ? "act" : "watch",
      finding: `The model puts ${BAND[band]} of water at the building in ${storm(firstWet)}.`,
      todo: {
        buying: "Ask how high the floor sits above the yard, and price in flood vents or raised equipment.",
        renting: "Choose an upper floor, or keep valuables and electronics off the ground floor.",
        building: `Set the finished floor ${FLOOR_ABOVE[band]} here, with margin, and keep utilities above it.`,
      }[lens],
    });
  } else {
    items.push({
      title: "Water at the building",
      level: "good",
      finding: "The model keeps water under 6 in at the building, even in worst-case rain.",
      todo: "Still look at the street on the map: water nearby can close the way out.",
    });
  }

  // 2. The official zone, and what it means for insurance or floor height.
  if (highRisk) {
    items.push({
      title: "Official flood zone",
      level: lens === "renting" ? "watch" : "act",
      finding: `Official map: ${grade.officialMapSays}.`,
      todo: {
        buying: "A federally backed mortgage requires flood insurance in this zone. Get a quote before you make an offer.",
        renting: "Renters insurance does not cover flood. Ask about a contents-only flood policy.",
        building: "New buildings in this zone need the lowest floor at or above the base flood elevation. Order an elevation certificate before you design.",
      }[lens],
    });
  } else {
    items.push({
      title: "Official flood zone",
      level: firstWet ? "watch" : "good",
      finding: `Official map: ${grade.officialMapSays}.${firstWet ? " The model finds more water than that." : ""}`,
      todo: {
        buying: firstWet
          ? "Flood insurance is not required here, but home insurance does not cover flood. Get a quote anyway."
          : "Flood insurance is optional here. Home insurance does not cover flood, so a quote is still worth having.",
        renting: "Renters insurance does not cover flood. A contents-only flood policy does.",
        building: firstWet
          ? "The flood map sets no floor height here, so the model result above is your reason to add height."
          : "The flood map sets no floor height here.",
      }[lens],
    });
  }

  // 3. What Hurricane Milton did here.
  const ask = {
    buying: "Ask the seller for repair records and any flood insurance claims.",
    renting: "Ask the landlord what flooded and what was repaired.",
    building: "Walk the lot after rain and see where the water sits.",
  }[lens];
  if (miltonNearby) {
    items.push({ title: "What Milton did", level: "act", finding: "County inspectors recorded Hurricane Milton flood damage within 100 m of this spot.", todo: ask });
  } else if (miltonWet) {
    items.push({
      title: "What Milton did",
      level: "watch",
      finding: `In the model's replay of Hurricane Milton, ${BAND[grade.depthByStorm.milton]} of water reached the building.`,
      todo: ask,
    });
  } else {
    items.push({
      title: "What Milton did",
      level: "good",
      finding: "No Milton flood damage was recorded within 100 m, and the replay keeps the building under 6 in.",
      todo: "Ask anyway: not every flooded home was inspected.",
    });
  }

  // 4. Pump dependence, only where the grade found it.
  if (pump) {
    items.push({
      title: "Pump station",
      level: "watch",
      finding: "This spot stays drier only while the nearby pump station runs.",
      todo: "Ask what happens in a power cut. Pumps lost power here during Milton.",
    });
  }

  // 5. The last step for each decision.
  if (lens === "buying") {
    items.push({
      title: "Before you sign",
      level: "watch",
      finding: "Florida sellers must give you a flood disclosure form at or before the contract.",
      todo: "Read it first. It covers flood claims, federal flood aid and flood damage the seller knows about.",
    });
  } else if (lens === "renting") {
    items.push({
      title: "Before you sign",
      level: "watch",
      finding: "For a lease of a year or longer, Florida landlords must give you a separate flood disclosure.",
      todo: "Ask for it before you sign, and open During to see when streets here close to a car.",
    });
  } else {
    const collects = firstWet !== null || ["C", "D", "F"].includes(grade.letter);
    items.push({
      title: "Drainage on the lot",
      level: collects ? "watch" : "good",
      finding: collects ? "Water collects on or around this ground in the model." : "This ground sheds water in the model.",
      todo: collects
        ? "Plan storage on the lot, such as a swale, a rain garden or permeable paving, so runoff does not go to the neighbours."
        : "Keep it that way: grade away from the building and do not fill the low spots that carry water.",
    });
  }
  return items;
}
