// The contract between the interface and the logic. Mirrors docs/contracts.md.
// Changing anything here needs both Harshith and Hansika to agree first.

export type LngLat = [lng: number, lat: number];

/** Storm scenarios, exactly as in the manifest and levels/ file names. */
export const SCENARIOS = ["10yr", "25yr", "100yr", "500yr", "milton"] as const;
export type Scenario = (typeof SCENARIOS)[number];
export type PumpState = "on" | "off";

export const VEHICLE_CLASSES = ["foot", "car", "suv", "fire_engine", "high_water"] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

/** Hours count whole steps from manifest.hourZero. null means "never" within the scenario. */
export type Hour = number;

export const LAYER_NAMES = [
  "fema-zones",
  "pump-stations",
  "drains",
  "ponds",
  "fire-stations",
  "hospitals",
  "milton-damage",
  "known-flooding",
  "storm-pipes",
  "outfalls",
] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

/** Returned instead of an answer when a position is off the grid or its catchment is clipped. */
export interface Outside {
  kind: "outside";
}

// ---------- Gold files ----------

export interface Manifest {
  version: string;
  /** [west, south, east, north] in degrees */
  bbox: [number, number, number, number];
  grid: { width: number; height: number; cellSizeM: number };
  /** ground.png decodes as min + (R*256 + G) / 65535 * (max - min), metres */
  groundRange: { min: number; max: number };
  /** Clock time of hour 0, ISO 8601 with offset */
  hourZero: string;
  hours: number;
  scenarios: Scenario[];
  units: "m";
  sources: { name: string; url: string; date: string }[];
}

export interface Bowl {
  id: number;
  lowestPoint: { position: LngLat; heightM: number };
  spillHeightM: number;
  spillsTo: number | null;
  parent: number | null;
  pump: boolean;
  storageAtSpillM3: number;
}

export interface GoldData {
  manifest: Manifest;
  /** Row-major, north row first, grid.width * grid.height cells */
  groundM: Float32Array;
  /** Same grid. 0 = drains away. bowls.png decodes as R + G*256 */
  bowlIds: Uint16Array;
  bowls: Bowl[];
  /** Image URLs, for the water layer to upload as textures directly */
  textures: { ground: string; bowls: string };
}

/** levels/<scenario>-pump-<on|off>.json */
export interface Levels {
  scenario: Scenario;
  pump: PumpState;
  /** bowl id -> water surface height in metres, one entry per hour */
  levels: Record<string, number[]>;
}

export interface Validation {
  hitRate: number;
  hits: number;
  total: number;
  falseAlarmAreaKm2: number;
  femaBaseline: { insideHighRisk: number; total: number };
  computedAt: string;
}

// ---------- Answers ----------

export type DepthResult = { kind: "ok"; depthM: number } | Outside;

export interface AddressSuggestion {
  id: string;
  label: string;
}
export interface AddressMatch {
  label: string;
  position: LngLat;
  inside: boolean;
}

export type Letter = "A" | "B" | "C" | "D" | "F";
export type DepthBand = "none" | "under_6in" | "6_12in" | "1_2ft" | "over_2ft";

export interface GradeReason {
  kind: "base" | "notch" | "cap";
  text: string;
}

export interface Grade {
  kind: "ok";
  letter: Letter;
  range: [best: Letter, worst: Letter];
  lowConfidence: boolean;
  reasons: GradeReason[];
  depthByStorm: Record<Scenario, DepthBand>;
  /** e.g. "Zone X, minimal flood hazard" */
  officialMapSays: string;
  /** e.g. "Water reaches 6 to 12 in at the door in a 25-year storm" */
  weFound: string;
  /** Paired action for a low grade; null for A and B */
  action: string | null;
}
export type GradeResult = Grade | Outside;

/** Per vehicle class, one entry per segment id: closing hour, 65535 = never */
export type ClosingHours = Record<VehicleClass, Uint16Array>;

export type RouteResult = { kind: "ok"; line: LngLat[]; minutes: number } | { kind: "no_route" };

export type CutoffResult = { kind: "ok"; lastHour: Hour | null } | Outside;

export type RescueReach =
  | { kind: "ok"; untilHour: Hour | null; reachableSegmentIds: number[] }
  | Outside;

export type LatestDeparture =
  | { kind: "ok"; moveByHour: Hour | null; parking: { name: string; position: LngLat } | null }
  | Outside;

export interface PublicReport {
  id: string;
  /** Snapped to a road segment midpoint */
  position: LngLat;
  depthM: number;
  createdAt: string;
  source: "gps" | "pin";
}

export interface QueueItem {
  id: string;
  photoUrl: string;
  exactPosition: LngLat;
  aiReading: { waterPresent: boolean; depthRangeM: [number, number]; reference: string; confidence: number };
  modelDepthM: number;
  createdAt: string;
}

export interface Calibration {
  pairs: { modelM: number; confirmedM: number }[];
  meanAbsErrorM: number;
}

/** Real-estate extra (Hansika, 11:50). Lower priority than the storm-day core. */
export interface BetterOption {
  address: string;
  position: LngLat;
  assessedValue: number;
  beds: number;
  baths: number;
  livingAreaSqft: number;
  propertyType: string;
  grade: Letter;
  distanceM: number;
}

/** Every route returns this on failure, with a 4xx or 5xx status. */
export interface ApiError {
  error: { code: string; message: string };
}
