// A giver's private dashboard. GET ?token= -> { giver, demand }. POST { token, served } adds people served.
import { z } from "zod";
import { apiError } from "@/lib/api";
import { demandFor, publicGiver } from "@/lib/food/share";
import { findGiver, listRequests, saveGiver } from "@/lib/food/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const g = await findGiver(id, token);
    if (!g) return apiError(404, "not_found", "No giver with that link");
    return Response.json({ giver: { ...publicGiver(g), served: g.served }, demand: demandFor(g, await listRequests(), Date.now()) });
  } catch {
    return apiError(503, "not_configured", "Food share is unavailable right now");
  }
}

const Served = z.object({ token: z.string().min(10), served: z.number().int().min(1).max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Served.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "bad_request", "served must be 1 to 500");
  try {
    const g = await findGiver(id, body.data.token);
    if (!g) return apiError(404, "not_found", "No giver with that link");
    g.served += body.data.served;
    await saveGiver(g);
    return Response.json({ served: g.served });
  } catch {
    return apiError(503, "not_configured", "Food share is unavailable right now");
  }
}
