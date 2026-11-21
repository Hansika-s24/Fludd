// STUB (Harshith's 11:00 scaffold). Hansika replaces this; name and types stay as in docs/contracts.md.
import type { GradeResult, LngLat } from "@/lib/types";

/** STUB: a fixed C for anything inside the toy box. */
export async function gradeFor(position: LngLat): Promise<GradeResult> {
  const [lng, lat] = position;
  if (lng < -82.42 || lng > -82.408 || lat < 28.055 || lat > 28.064) return { kind: "outside" };
  return {
    kind: "ok",
    letter: "C",
    range: ["B", "D"],
    lowConfidence: false,
    reasons: [
      { kind: "base", text: "Sits in a low bowl that fills in a 25-year storm" },
      { kind: "notch", text: "A pump station drains this bowl, which helps when it has power" },
      { kind: "cap", text: "Milton damage was recorded nearby, so the grade cannot be above B" },
    ],
    depthByStorm: { "10yr": "none", "25yr": "under_6in", "100yr": "6_12in", "500yr": "1_2ft", milton: "6_12in" },
    officialMapSays: "Zone X, minimal flood hazard",
    weFound: "Water reaches 6 to 12 in at the door in a 100-year storm",
    action: "Keep sandbags ready and move your car before the peak",
  };
}
