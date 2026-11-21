// Demo 3, "Your camera is a gauge": the simulated camera readings and the pure functions that word them.
// The readings are a fixture that lives in the browser only. Nothing here is sent anywhere.
// The model's depths are NOT in this file: they come from depthAt() at runtime.
import { inches } from "@/components/report/depth-words";
import type { Hour, LngLat } from "@/lib/types";

/**
 * The kerb the simulated camera watches: the street edge by 2004 E 140th Ave, Tampa.
 * Chosen from the real data (public/data, 100-year storm, pumps on) by scanning the grid cells within
 * 6 cells of every parcel address for one the model floods gradually over model hours 10 to 13
 * (about 0.08, 0.28, 0.46, 0.48 m), so both lines on the chart have a shape worth comparing.
 */
export const CAMERA_SPOT: LngLat = [-82.435802, 28.075131];
export const CAMERA_SPOT_LABEL = "the kerb by 2004 E 140th Ave";

export interface CameraFrame {
  /** Clock time of the still. Model hour 0 is 8:00 am for the 100-year storm. */
  time: string;
  /** The model hour this still is set against. */
  hour: Hour;
  /** The reading the camera would send: lowest and highest plausible depth, metres. */
  rangeM: [number, number];
}

/** Four stills from one evening, an hour apart so each lines up with one hour of the model. Simulated. */
export const CAMERA_FRAMES: readonly CameraFrame[] = [
  { time: "6:05 pm", hour: 10, rangeM: [0.03, 0.07] },
  { time: "7:05 pm", hour: 11, rangeM: [0.11, 0.17] },
  { time: "8:05 pm", hour: 12, rangeM: [0.22, 0.3] },
  { time: "9:05 pm", hour: 13, rangeM: [0.34, 0.42] },
];

/** The single depth a reading stands for on the chart and in comparisons: the middle of its range. */
export function midDepth(frame: CameraFrame): number {
  return (frame.rangeM[0] + frame.rangeM[1]) / 2;
}

// ---------- bands (the app's four: under 6 in, 6 to 12 in, 1 to 2 ft, over 2 ft) ----------

export interface DepthBand {
  label: string;
  /** A CSS colour for the ring and the reading. Never the "safe" green: no depth of water is called safe. */
  color: string;
  /** Ring diameter on the map, px. */
  ring: number;
}

const BANDS: readonly [maxM: number, band: DepthBand][] = [
  [0.1524, { label: "under 6 in", color: "var(--color-tint)", ring: 28 }],
  [0.3048, { label: "6 to 12 in", color: "var(--color-warn)", ring: 36 }],
  [0.6096, { label: "1 to 2 ft", color: "var(--color-late)", ring: 44 }],
  [Infinity, { label: "over 2 ft", color: "var(--color-late)", ring: 52 }],
];

export function bandOf(depthM: number): DepthBand {
  for (const [max, band] of BANDS) if (depthM < max) return band;
  return BANDS[BANDS.length - 1][1];
}

// ---------- the reference object in the picture ----------

/** Heights in the scene, metres above the road: the kerb top, the bottom of the wheel rim, and the rim proper. */
export const KERB_BELOW_M = 0.1;
export const RIM_REACH_M = 0.2;
export const RIM_OVER_M = 0.3;

export type Reference = "below the kerb" | "at the kerb" | "to the tyre rim" | "over the rim";

/** Where the water stands against the things the camera can see. */
export function referenceWords(depthM: number): Reference {
  if (depthM < KERB_BELOW_M) return "below the kerb";
  if (depthM < RIM_REACH_M) return "at the kerb";
  if (depthM < RIM_OVER_M) return "to the tyre rim";
  return "over the rim";
}

// ---------- trend ----------

export type Trend = "rising" | "steady" | "falling";

/** A change smaller than this (about three quarters of an inch) is the camera's noise, not the water moving. */
export const TREND_TOLERANCE_M = 0.02;

/** Which way the water moved since the last still. The first still has nothing before it: "steady". */
export function trend(previousM: number | null, currentM: number): Trend {
  if (previousM === null) return "steady";
  const change = currentM - previousM;
  if (change > TREND_TOLERANCE_M) return "rising";
  if (change < -TREND_TOLERANCE_M) return "falling";
  return "steady";
}

// ---------- the car ----------

/** The depth where a car should not drive. Below it is NOT "safe": the app never says that of any depth. */
export const CAR_MOVE_DEPTH_M = 0.3;

export function pastCarPoint(depthM: number): boolean {
  return depthM >= CAR_MOVE_DEPTH_M;
}

/** The car line for one reading. */
export function carWords(depthM: number): string {
  return pastCarPoint(depthM)
    ? "Past the point where a car should move."
    : "Not yet past the point where a car should move. No depth of water is safe to drive through.";
}

/** The first still whose reading is past the car point, or null when none is. */
export function firstPastCarPoint(frames: readonly CameraFrame[]): CameraFrame | null {
  return frames.find((f) => pastCarPoint(midDepth(f))) ?? null;
}

// ---------- camera against model ----------

/** Readings closer than this (about an inch) count as agreeing. */
export const AGREE_TOLERANCE_M = 0.03;

/** One sentence on which way the model is off at a still, from the camera's depth and the model's, in metres. */
export function comparisonSentence(time: string, cameraM: number, modelM: number): string {
  const gap = modelM - cameraM;
  if (Math.abs(gap) < AGREE_TOLERANCE_M) {
    return `At ${time} the model and the camera agree to within about an inch.`;
  }
  const by = Math.max(1, inches(Math.abs(gap)));
  return gap > 0
    ? `At ${time} the model has the water about ${by} in deeper than the camera read at this kerb.`
    : `At ${time} the model has the water about ${by} in shallower than the camera read at this kerb.`;
}
