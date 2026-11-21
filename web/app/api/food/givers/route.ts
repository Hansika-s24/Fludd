// Food share givers. GET -> { givers (public fields), leaderboard }. POST NewGiver -> { id, token } (token shown once).
import { apiError } from "@/lib/api";
import { leaderboard, NewGiver, publicGiver } from "@/lib/food/share";
import { addGiver, listGivers } from "@/lib/food/store";

export async function GET() {
  try {
    const givers = await listGivers();
    return Response.json({ givers: givers.map(publicGiver), leaderboard: leaderboard(givers) });
  } catch {
    return apiError(503, "not_configured", "Food share is unavailable right now");
  }
}

export async function POST(request: Request) {
  const body = NewGiver.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "bad_request", body.error.issues[0]?.message ?? "Check the form");
  try {
    const { giver, token } = await addGiver(body.data);
    return Response.json({ id: giver.id, token }, { status: 201 });
  } catch {
    return apiError(503, "not_configured", "Food share is unavailable right now");
  }
}
