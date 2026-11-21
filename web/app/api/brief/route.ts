// A short weather and alert brief at a point, for the iPhone "Flood brief" Shortcut and its Home Screen widget.
// GET /api/brief?lat=&lng=            -> { text, forecast, alerts }
// GET /api/brief?lat=&lng=&format=text -> the text alone, ready for Show Result or Speak Text.
// Nothing is stored or logged: the position is used for this one answer only.
import { apiError } from "@/lib/api";
import { serverConfig } from "@/lib/config";
import { briefText, getForecast } from "@/lib/forecast";

async function nwsAlerts(lat: number, lng: number): Promise<string[]> {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { "User-Agent": serverConfig().nwsUserAgent, Accept: "application/geo+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { features?: { properties?: { event?: string } }[] };
    return (body.features ?? []).map((f) => f.properties?.event).filter((e): e is string => typeof e === "string" && e.length > 0);
  } catch {
    return []; // ponytail: alerts are a bonus here; the brief still answers without them.
  }
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!q.get("lat") || !q.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return apiError(400, "bad_request", "lat and lng must be numbers in range");
  }
  try {
    const [forecast, alerts] = await Promise.all([getForecast([lng, lat]), nwsAlerts(lat, lng)]);
    const text = briefText(forecast, alerts);
    const headers = { "Cache-Control": "public, max-age=300" };
    if (q.get("format") === "text") return new Response(text, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    return Response.json({ text, forecast, alerts }, { headers });
  } catch {
    return apiError(502, "upstream_error", "The weather service is unavailable right now");
  }
}
