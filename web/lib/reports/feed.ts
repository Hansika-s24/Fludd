// Server only. GET /api/reports?status=approved: approved reports at their street-level position.
// Reads public_reports through the anon client, so row-level security decides what is visible and
// exact positions (which live only in reports) can never be returned.
import { apiError } from "@/lib/api";
import type { PublicReport } from "@/lib/types";
import type { ReportStore } from "./store";

/** Newest first. The map needs recent reports, not the whole history. */
export const FEED_LIMIT = 500;

export async function handleApprovedFeed(request: Request, store: ReportStore): Promise<Response> {
  const status = new URL(request.url).searchParams.get("status");
  if (status !== "approved") return apiError(400, "bad_request", "status=approved is the only public query");
  try {
    const rows = await store.listApproved(FEED_LIMIT);
    const reports: PublicReport[] = rows.map((r) => ({
      id: r.id,
      position: [r.lng, r.lat],
      depthM: r.depth_m,
      createdAt: r.created_at,
      source: r.source,
    }));
    return Response.json({ reports }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error(`[reports] feed: ${err instanceof Error ? err.message : "failed"}`);
    return apiError(502, "storage_failed", "Reports are unavailable right now");
  }
}
