// STUB (Harshith's 11:00 scaffold). Real version calls the AI provider; the app works with it off.
import { apiError } from "@/lib/api";

/** Body: the numbers for one address and hour (grade, depth bands, moveByHour, ...). */
export async function POST(request: Request) {
  if (!(await request.json().catch(() => null))) return apiError(400, "bad_request", "JSON body required");
  return Response.json({ text: "Water may reach your door in a large storm. Move your car to higher ground before the evening peak." });
}
