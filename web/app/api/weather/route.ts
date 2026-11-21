// STUB (Harshith's 11:00 scaffold). Real version proxies api.weather.gov with NWS_USER_AGENT.
import { apiError } from "@/lib/api";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (!searchParams.get("lat") || !searchParams.get("lng")) return apiError(400, "bad_request", "lat and lng are required");
  return Response.json({ alerts: [{ event: "Flood Watch", headline: "Toy alert: Flood Watch until 8 pm", severity: "Moderate" }] });
}
