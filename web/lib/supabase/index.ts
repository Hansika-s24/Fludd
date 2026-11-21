// STUB (Harshith's 11:00 scaffold). Hansika replaces these; names and types stay as in docs/contracts.md.
import type { Calibration, PublicReport, QueueItem } from "@/lib/types";

const TOY_REPORTS: PublicReport[] = [
  { id: "r1", position: [-82.4162, 28.0596], depthM: 0.25, createdAt: "2026-11-21T11:30:00-05:00", source: "gps" },
];

/** STUB: calls back once with toy reports; returns the unsubscribe function. */
export function subscribeApprovedReports(onChange: (reports: PublicReport[]) => void): () => void {
  const t = setTimeout(() => onChange(TOY_REPORTS), 0);
  return () => clearTimeout(t);
}

/** STUB: any sign-in is an admin. */
export async function adminSignIn(_email: string, _password: string): Promise<{ isAdmin: boolean }> {
  return { isAdmin: true };
}

/** STUB */
export async function getQueue(): Promise<QueueItem[]> {
  return [
    {
      id: "q1",
      photoUrl: "",
      exactPosition: [-82.4115, 28.0593],
      aiReading: { waterPresent: true, depthRangeM: [0.15, 0.3], reference: "car tyre", confidence: 0.7 },
      modelDepthM: 0.22,
      createdAt: "2026-11-21T11:40:00-05:00",
    },
  ];
}

/** STUB */
export async function getCalibration(): Promise<Calibration> {
  return { pairs: [{ modelM: 0.22, confirmedM: 0.25 }, { modelM: 0.4, confirmedM: 0.3 }], meanAbsErrorM: 0.07 };
}
