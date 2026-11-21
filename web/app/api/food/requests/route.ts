// An anonymous request for food or supplies. POST NewRequest -> { code, givers } (givers in reach, nearest first).
// Stored: a ~500 m cell, the head count, what is needed and the code's hash. No name, contact or exact position.
import { apiError } from "@/lib/api";
import { giversFor, NewRequest, publicGiver, toCell } from "@/lib/food/share";
import { addRequest, listGivers } from "@/lib/food/store";

export async function POST(request: Request) {
  const body = NewRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "bad_request", body.error.issues[0]?.message ?? "Check the form");
  try {
    const [{ code }, givers] = await Promise.all([addRequest(body.data), listGivers()]);
    const matches = giversFor(toCell(body.data.position), givers, body.data.needs).map((g) => ({ ...publicGiver(g), distanceM: Math.round(g.distanceM) }));
    return Response.json({ code, givers: matches }, { status: 201 });
  } catch {
    return apiError(503, "not_configured", "Food share is unavailable right now");
  }
}
