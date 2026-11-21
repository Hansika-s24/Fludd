// Admin moderation (Hansika). Logic in lib/reports/moderate.ts.
// Header Authorization: Bearer <Supabase access token>; body { decision: "approve" | "reject" | "edit", depthM?: number }
// -> { id, status: "approved" | "rejected", finalDepthM: number | null }; 401 not signed in, 403 not an admin.
import { defaultStore, guarded, handleModerate } from "@/lib/reports";

export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]/moderate">) {
  const { id } = await ctx.params;
  return guarded(() => handleModerate(request, id, { store: defaultStore("service") }));
}
