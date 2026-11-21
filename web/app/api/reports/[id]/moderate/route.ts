// STUB (Harshith's 11:00 scaffold). Real version checks the admin session.
import { apiError } from "@/lib/api";

/** Body: { decision: "approve" | "reject" | "edit", depthM?: number } */
export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]/moderate">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { decision?: string; depthM?: number } | null;
  if (!body || !["approve", "reject", "edit"].includes(body.decision ?? "")) return apiError(400, "bad_request", "decision must be approve, reject or edit");
  return Response.json({ id, status: body.decision === "reject" ? "rejected" : "approved", finalDepthM: body.depthM ?? null });
}
