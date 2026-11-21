// Demo 1, "Neighbours report": the simulated reports and the pure rules that set them against the model.
// Everything a resident "says" here is made up for the walk and labelled so on screen. Nothing the model says
// is in this file: every model depth is read with depthAt() while the page runs.
import { depthBand } from "@/lib/grade";
import type { DepthBand, Hour, LngLat, PumpState, Scenario } from "@/lib/types";
import type { MapMark } from "@/components/map/map-view";
import { inches } from "@/components/report/depth-words";

export const DEMO_SCENARIO: Scenario = "100yr";
export const DEMO_PUMP: PumpState = "on";
/**
 * Hour 18 of 48. In levels/100yr-pump-on.json the count of road-graph nodes under more than 5 cm of water
 * climbs from hour 10, flattens near 800 by hour 14 and is highest (804) at hour 18.
 */
export const DEMO_HOUR: Hour = 18;

/**
 * The crossing the walk opens on: a four-way node of the road graph (graph.bin) on E 110th Ave. The street name
 * comes from the nearest county parcels (2329 and 2601 E 110th Ave, both under 30 m away).
 *
 * How it was chosen, from the real files in public/data on 2026-11-21: every graph node with three or more
 * roads meeting and 15 to 50 cm of model water at hour 18 of the 100-year storm with pumps on (267 nodes) was
 * scored by how many other wet nodes sit within 250 m and how many homes sit within 150 m. This one has model
 * water on four nearby roads, dry road a block east, and 83 homes within 150 m.
 */
export const DEMO_CENTRE: LngLat = [-82.430893, 28.048676];
/** Where the crossing is, in words. From the county parcel addresses above, not from the model. */
export const DEMO_PLACE = "E 110th Ave";

/** What the resident held the water against. */
export type Reference = "kerb" | "tyre" | "bumper" | "door";

export interface DemoReport {
  id: string;
  /** Initials only: a report never shows a name. */
  initials: string;
  minutesAgo: number;
  position: LngLat;
  /** The simulated reading, as one of the app's depth bands. */
  band: DepthBand;
  /** null for a report of no standing water. */
  reference: Reference | null;
}

/**
 * Six simulated reports, oldest first. Each position is a node of the road graph, or a point on the straight
 * line between two joined nodes, within 170 m of DEMO_CENTRE, so every ring sits on a road. The readings are
 * invented; the model depth at each spot is not written here and is looked up at run time.
 */
export const DEMO_REPORTS: readonly DemoReport[] = [
  { id: "r1", initials: "A.B.", minutesAgo: 24, position: [-82.430893, 28.047218], band: "under_6in", reference: "kerb" },
  { id: "r2", initials: "D.L.", minutesAgo: 19, position: [-82.429848, 28.048679], band: "none", reference: null },
  { id: "r3", initials: "S.K.", minutesAgo: 15, position: [-82.430893, 28.04745], band: "6_12in", reference: "tyre" },
  { id: "r4", initials: "J.R.", minutesAgo: 11, position: [-82.430893, 28.047932], band: "1_2ft", reference: "bumper" },
  { id: "r5", initials: "M.T.", minutesAgo: 8, position: [-82.430893, 28.048304], band: "1_2ft", reference: "bumper" },
  { id: "r6", initials: "P.N.", minutesAgo: 4, position: [-82.430885, 28.049431], band: "1_2ft", reference: "bumper" },
];

// ---------- bands ----------

/**
 * Each band's ends in metres, the same edges as depthBand() in lib/grade (6 in, 1 ft, 2 ft).
 * OUR ASSUMPTION: "over 2 ft" has no top, so it is read as 2 to 4 ft; 4 ft is the next edge on the map key.
 */
export const BAND_RANGE_M: Record<DepthBand, [lo: number, hi: number]> = {
  none: [0, 0],
  under_6in: [0, 0.15],
  "6_12in": [0.15, 0.3],
  "1_2ft": [0.3, 0.61],
  over_2ft: [0.61, 1.22],
};

const BAND_ORDER: readonly DepthBand[] = ["none", "under_6in", "6_12in", "1_2ft", "over_2ft"];

export const BAND_WORDS: Record<DepthBand, string> = {
  none: "no standing water",
  under_6in: "under 6 in",
  "6_12in": "6 to 12 in",
  "1_2ft": "1 to 2 ft",
  over_2ft: "over 2 ft",
};

/** A reading is a band, not a number. When a number is needed it is the middle of the band. */
export function bandMiddleM(band: DepthBand): number {
  const [lo, hi] = BAND_RANGE_M[band];
  return (lo + hi) / 2;
}

/** "6 to 12 in at the tyre", or "no standing water". */
export function readingWords(report: Pick<DemoReport, "band" | "reference">): string {
  if (report.band === "none" || report.reference === null) return BAND_WORDS[report.band];
  return `${BAND_WORDS[report.band]} at the ${report.reference}`;
}

/** "A.B. · 10 min ago · 6 to 12 in at the tyre" */
export function reportLine(report: DemoReport): string {
  return `${report.initials} · ${report.minutesAgo} min ago · ${readingWords(report)}`;
}

/** The model's depth in words: "no water", "under 1 in", "about 9 in". */
export function modelWords(m: number): string {
  if (m <= 0) return "no water";
  const inch = inches(m);
  return inch < 1 ? "under 1 in" : `about ${inch} in`;
}

// ---------- the map rings ----------

const MARK: Record<DepthBand, { color: string; size: number }> = {
  none: { color: "var(--color-safe)", size: 18 },
  under_6in: { color: "var(--color-tint)", size: 24 },
  "6_12in": { color: "var(--color-warn)", size: 32 },
  "1_2ft": { color: "var(--color-late)", size: 42 },
  over_2ft: { color: "var(--color-late)", size: 54 },
};

/** The ring a report puts on the map: wider for deeper water, coloured by band. */
export function markFor(report: DemoReport): MapMark {
  const { color, size } = MARK[report.band];
  return { id: report.id, position: report.position, color, size, label: report.band === "none" ? "No water" : BAND_WORDS[report.band] };
}

// ---------- model against residents ----------

export type Verdict = "deeper" | "shallower" | "agrees";

export interface Comparison {
  verdict: Verdict;
  /** Middle of the reported band minus the model's depth, in metres. Positive: the resident saw more water. */
  diffM: number;
}

/**
 * One report against the model at the same spot. They agree when the model's depth falls in the band the
 * resident picked (the app's own band rule); otherwise the resident is deeper or shallower than the model.
 * Returns null when there is no model value to compare with.
 */
export function compare(band: DepthBand, modelM: number | null): Comparison | null {
  if (modelM === null || !Number.isFinite(modelM)) return null;
  const diffM = bandMiddleM(band) - modelM;
  const step = BAND_ORDER.indexOf(band) - BAND_ORDER.indexOf(depthBand(modelM));
  return { verdict: step === 0 ? "agrees" : step > 0 ? "deeper" : "shallower", diffM };
}

export interface Summary {
  /** Reports that found standing water. */
  withWater: number;
  /** Of those, the ones with a model value to compare with. */
  compared: number;
  deeper: number;
  shallower: number;
  agree: number;
  /** Mean gap in metres over the deeper reports (0 when there are none). */
  deeperByM: number;
  /** Mean gap in metres over the shallower reports, as a positive number (0 when there are none). */
  shallowerByM: number;
}

/** Counts and mean gaps over the reports that found water. A "no standing water" report is left out. */
export function summarise(rows: readonly { band: DepthBand; modelM: number | null }[]): Summary {
  const s: Summary = { withWater: 0, compared: 0, deeper: 0, shallower: 0, agree: 0, deeperByM: 0, shallowerByM: 0 };
  let deeperSum = 0;
  let shallowerSum = 0;
  for (const row of rows) {
    if (row.band === "none") continue;
    s.withWater++;
    const c = compare(row.band, row.modelM);
    if (!c) continue;
    s.compared++;
    if (c.verdict === "deeper") {
      s.deeper++;
      deeperSum += c.diffM;
    } else if (c.verdict === "shallower") {
      s.shallower++;
      shallowerSum -= c.diffM;
    } else {
      s.agree++;
    }
  }
  if (s.deeper > 0) s.deeperByM = deeperSum / s.deeper;
  if (s.shallower > 0) s.shallowerByM = shallowerSum / s.shallower;
  return s;
}

/** The one line under the comparison. It leads with the larger group; a tie leads with deeper. */
export function summarySentence(s: Summary): string {
  if (s.withWater === 0) return "No report here found standing water.";
  if (s.compared === 0) return "Model value unavailable in this build.";
  const reports = s.compared === 1 ? "report" : "reports";
  if (s.agree === s.compared) {
    return s.compared === 1 ? "The 1 report with water agrees with the model." : `All ${s.compared} reports with water agree with the model.`;
  }
  const deeperLeads = s.deeper >= s.shallower;
  const count = deeperLeads ? s.deeper : s.shallower;
  const gapM = deeperLeads ? s.deeperByM : s.shallowerByM;
  return `${count} of ${s.compared} ${reports} with water ${count === 1 ? "is" : "are"} ${deeperLeads ? "deeper" : "shallower"} than the model, by about ${inches(gapM)} in.`;
}

// ---------- what it changes ----------

/** Water this deep (0.30 m, about 1 ft) is where a car should not drive. */
export const IMPASSABLE_M = 0.3;

/**
 * A reading counts as "reported impassable to cars" when the middle of its band is at or over 0.30 m.
 * A reading under that is never called passable: the app does not say a flooded road is safe.
 */
export function isImpassable(band: DepthBand): boolean {
  return bandMiddleM(band) >= IMPASSABLE_M;
}

export function impassableReports(reports: readonly DemoReport[]): DemoReport[] {
  return reports.filter((r) => isImpassable(r.band));
}
