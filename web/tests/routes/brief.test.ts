import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/brief/route";

afterEach(() => vi.unstubAllGlobals());

const weather = {
  current: { time: "2026-11-21T15:00", temperature_2m: 74, apparent_temperature: 80, weather_code: 61, precipitation: 0, wind_speed_10m: 5, relative_humidity_2m: 80 },
  hourly: { time: ["2026-11-21T15:00", "2026-11-21T16:00"], precipitation_probability: [80, 10], precipitation: [0.2, 0] },
};

describe("GET /api/brief", () => {
  it("rejects a bad position", async () => {
    const res = await GET(new Request("http://x/api/brief?lat=abc&lng=1"));
    expect(res.status).toBe(400);
  });

  it("answers plain text for a Shortcut, alerts first", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      const host = new URL(u).host;
      if (host === "api.weather.gov") return new Response(JSON.stringify({ features: [{ properties: { event: "Flood Watch" } }] }));
      if (host.startsWith("air-quality")) return new Response(JSON.stringify({ current: { us_aqi: 40 } }));
      return new Response(JSON.stringify(weather));
    }));
    const res = await GET(new Request("http://x/api/brief?lat=28.06&lng=-82.41&format=text"));
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe(
      "Weather Service alert: Flood Watch. Rain likely from now until 4 pm, about 0.2 in. Now 74° and rain, feels 80°. Air quality good (40). Never drive or walk into floodwater.",
    );
  });
});
