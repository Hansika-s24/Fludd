// STUB (Harshith's 11:00 scaffold). Real-estate extra. Gemini may not add numbers; the app works with it off.
import { apiError } from "@/lib/api";

/** Body: the numbers for one address. Returns 2 to 4 plain sentences. */
export async function POST(request: Request) {
  if (!(await request.json().catch(() => null))) return apiError(400, "bad_request", "JSON body required");
  return Response.json({
    sentences: [
      "Raising the floor above the 100-year water line is the most effective fix.",
      "Flood vents let water pass through a crawl space instead of pushing on the walls.",
      "Flood insurance is worth pricing even outside the high-risk zone.",
    ],
  });
}
