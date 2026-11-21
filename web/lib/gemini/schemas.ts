// Input shapes for the Gemini routes, and the plain-words facts the model is shown.
import { z } from "zod";
import { SCENARIOS, type DepthBand, type Scenario } from "@/lib/types";

const letter = z.enum(["A", "B", "C", "D", "F"]);
const band = z.enum(["none", "under_6in", "6_12in", "1_2ft", "over_2ft"]);
const scenario = z.enum(SCENARIOS);
const depthM = z.number().min(0).max(20);
const hour = z.number().int().min(0).max(1000);
const label = (max: number) => z.string().trim().min(1).max(max);

/** POST /api/gemini/remedies body: the numbers for one address. */
export const remediesInput = z.strictObject({
  letter,
  depthByStorm: z.record(scenario, band),
  /** FEMA zone text, e.g. "Zone X, minimal flood hazard" */
  femaZone: label(120),
  miltonPointNearby: z.boolean(),
  pumpDependent: z.boolean(),
  /** Modelled depth at the building in the 100-year storm, metres */
  depthAtBuilding100yrM: depthM,
});
export type RemediesInput = z.infer<typeof remediesInput>;

/** POST /api/gemini/guidance body: the numbers for one address and hour. Labels are clock text such as "2 PM". */
export const guidanceInput = z.strictObject({
  letter,
  scenario,
  pump: z.enum(["on", "off"]),
  hour,
  timeLabel: label(40).optional(),
  depthM,
  depthBand: band.optional(),
  moveByHour: hour.nullable().optional(),
  moveByLabel: label(40).nullable().optional(),
  cutoffHour: hour.nullable().optional(),
  cutoffLabel: label(40).nullable().optional(),
  parkingName: label(80).nullable().optional(),
});
export type GuidanceInput = z.infer<typeof guidanceInput>;

const BAND_WORDS: Record<DepthBand, string> = {
  none: "no water at the door",
  under_6in: "under 6 inches",
  "6_12in": "6 to 12 inches",
  "1_2ft": "1 to 2 feet",
  over_2ft: "over 2 feet",
};

const STORM_WORDS: Record<Scenario, string> = {
  "10yr": "10-year storm",
  "25yr": "25-year storm",
  "100yr": "100-year storm",
  "500yr": "500-year storm",
  milton: "Hurricane Milton replay",
};

const when = (lbl: string | null | undefined, h: number | null | undefined, none: string) =>
  lbl ?? (h === null || h === undefined ? none : `hour ${h} of the storm`);

/** What the model sees for remedies. Every number it may use is in here. */
export function remediesFacts(i: RemediesInput) {
  return {
    floodGrade: i.letter,
    waterAtTheDoorByStorm: Object.fromEntries(
      SCENARIOS.filter((s) => i.depthByStorm[s]).map((s) => [STORM_WORDS[s], BAND_WORDS[i.depthByStorm[s]]]),
    ),
    officialFemaMapSays: i.femaZone,
    hurricaneMiltonFloodDamageReportedNearby: i.miltonPointNearby,
    dependsOnAPumpStation: i.pumpDependent,
    modelledWaterDepthAtTheBuildingIn100YearStormMetres: i.depthAtBuilding100yrM,
  };
}

/** What the model sees for guidance. Hour indices become clock labels when given. */
export function guidanceFacts(i: GuidanceInput) {
  return {
    floodGrade: i.letter,
    storm: STORM_WORDS[i.scenario],
    pumpStations: i.pump === "on" ? "working" : "failed",
    timeNow: when(i.timeLabel, i.hour, "now"),
    waterDepthAtTheDoorNowMetres: i.depthM,
    ...(i.depthBand ? { waterAtTheDoorNow: BAND_WORDS[i.depthBand] } : {}),
    moveYourCarBy:
      i.moveByHour === null && !i.moveByLabel ? "no need to move the car" : when(i.moveByLabel, i.moveByHour, "not known"),
    lastRouteOutCloses:
      i.cutoffHour === null && !i.cutoffLabel ? "a route out stays open" : when(i.cutoffLabel, i.cutoffHour, "not known"),
    ...(i.parkingName ? { dryParking: i.parkingName } : {}),
  };
}
