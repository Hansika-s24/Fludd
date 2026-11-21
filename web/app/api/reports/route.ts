// STUB (Harshith's 11:00 scaffold). Hansika owns this route from here.
import { apiError } from "@/lib/api";
import type { PublicReport } from "@/lib/types";

/** GET /api/reports?status=approved */
export function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  if (status !== "approved") return apiError(400, "bad_request", "status=approved is the only public query");
  const reports: PublicReport[] = [
    { id: "r1", position: [-82.4162, 28.0596], depthM: 0.25, createdAt: "2026-11-21T11:30:00-05:00", source: "gps" },
  ];
  return Response.json({ reports });
}

/** POST /api/reports: multipart form with photo, lat, lng, source ("gps" | "pin"), takenAt. Also what the Shortcut posts. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form?.get("photo") || !form.get("lat") || !form.get("lng")) return apiError(400, "bad_request", "photo, lat and lng are required");
  return Response.json(
    { id: "toy-report", status: "waiting", aiReading: { waterPresent: true, depthRangeM: [0.15, 0.3], reference: "curb", confidence: 0.6 } },
    { status: 201 },
  );
}
