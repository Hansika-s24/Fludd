// Server only. POST /api/reports/[id]/moderate: an admin approves, edits the depth of, or rejects a report.
// Header: Authorization: Bearer <Supabase access token of a signed-in admin>
// Body:   { decision: "approve" | "reject" | "edit", depthM?: number (0..5 m) }
//   approve: depthM, else the midpoint of the AI reading's depth range, else 400
//   edit:    depthM required; the report is approved with that depth
//   reject:  no depth
// The decision is appended to moderation_log before the report changes, so no approved report lacks a log row.
// Answers { id, status, finalDepthM }.
import { z } from "zod";
import { apiError } from "@/lib/api";
import type { ReportStore } from "./store";

export interface ModerateDeps {
  store: ReportStore;
  now?: () => Date;
}

const bodySchema = z.object({
  decision: z.enum(["approve", "reject", "edit"], { error: "decision must be approve, reject or edit" }),
  depthM: z.number().min(0).max(5).optional(),
});

export interface ModerateAnswer {
  id: string;
  status: "approved" | "rejected";
  finalDepthM: number | null;
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("authorization") ?? "");
  return match ? match[1] : null;
}

export async function handleModerate(request: Request, id: string, deps: ModerateDeps): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return apiError(401, "unauthorized", "Sign in as an admin first");
  const { store } = deps;

  try {
    const userId = await store.userIdForToken(token);
    if (!userId) return apiError(401, "unauthorized", "Your sign-in has expired, sign in again");
    if (!(await store.isAdmin(userId))) return apiError(403, "forbidden", "Only admins can moderate reports");

    const raw: unknown = await request.json().catch(() => undefined);
    const body = bodySchema.safeParse(raw);
    if (!body.success) {
      const issue = body.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
      return apiError(400, "bad_request", `${where}${issue?.message ?? "invalid body"}`);
    }
    const { decision, depthM } = body.data;

    if (!z.uuid().safeParse(id).success) return apiError(404, "not_found", "No report with this id");
    const report = await store.getReport(id);
    if (!report) return apiError(404, "not_found", "No report with this id");

    let finalDepthM: number | null = null;
    if (decision === "edit") {
      if (depthM === undefined) return apiError(400, "bad_request", "edit needs depthM");
      finalDepthM = depthM;
    } else if (decision === "approve") {
      const range = report.ai_reading?.depthRangeM;
      finalDepthM = depthM ?? (range ? (range[0] + range[1]) / 2 : null);
      if (finalDepthM === null) return apiError(400, "bad_request", "approve needs depthM: this report has no AI reading");
    }

    await store.insertLog({ report_id: id, admin_id: userId, decision, depth_m: finalDepthM });
    const status = decision === "reject" ? "rejected" : "approved";
    await store.updateReport(id, {
      status,
      final_depth_m: finalDepthM,
      decided_at: (deps.now ?? (() => new Date()))().toISOString(),
    });
    return Response.json({ id, status, finalDepthM } satisfies ModerateAnswer);
  } catch (err) {
    console.error(`[reports] moderate ${id}: ${err instanceof Error ? err.message : "failed"}`);
    return apiError(502, "storage_failed", "The decision could not be saved, try again");
  }
}
