// Weather now, rain over the next 12 hours, and air quality, from Open-Meteo (free, no key, CORS allowed).
// Used by the weather card and by GET /api/brief (the iPhone Shortcut widget). Added at Harshith's request, 15:15.
import { z } from "zod";
import type { LngLat } from "@/lib/types";

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const TZ = "America/New_York";

const ForecastBody = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    weather_code: z.number(),
    precipitation: z.number(),
    wind_speed_10m: z.number(),
    relative_humidity_2m: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    precipitation_probability: z.array(z.number().nullable()),
    precipitation: z.array(z.number().nullable()),
  }),
});
const AirBody = z.object({ current: z.object({ us_aqi: z.number().nullable() }) });

export interface HourRain {
  /** Local time, "2026-11-21T16:00". */
  time: string;
  chance: number;
  inches: number;
}

export interface Forecast {
  tempF: number;
  feelsF: number;
  code: number;
  windMph: number;
  humidity: number;
  hours: HourRain[];
  /** US AQI, or null when the air-quality service has no reading. */
  aqi: number | null;
}

/** Plain words for a WMO weather code. */
export function weatherWords(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return code === 65 || code === 82 ? "Heavy rain" : "Rain";
  if (code >= 95) return "Thunderstorms";
  return "Mixed";
}

/** "4 pm" from "2026-11-21T16:00" (already local time). */
export function hourWords(time: string): string {
  const h = Number(time.slice(11, 13));
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
}

/** Chance at or above which an hour counts as "rain likely". */
const LIKELY = 50;

/** One sentence on when it rains in the next hours: the first run of likely-rain hours, and how much falls. */
export function rainWindow(hours: HourRain[]): string {
  const first = hours.findIndex((h) => h.chance >= LIKELY);
  if (first < 0) {
    const peak = hours.reduce((m, h) => Math.max(m, h.chance), 0);
    return peak > 0 ? `Rain unlikely in the next ${hours.length} hours (at most ${peak}% chance)` : `No rain expected in the next ${hours.length} hours`;
  }
  let last = first;
  while (last + 1 < hours.length && hours[last + 1].chance >= LIKELY) last++;
  const total = hours.slice(first, last + 1).reduce((s, h) => s + h.inches, 0);
  const amount = total >= 0.05 ? `, about ${total.toFixed(1)} in` : "";
  const end = last + 1 < hours.length ? hourWords(hours[last + 1].time) : "later";
  const start = first === 0 ? "now" : hourWords(hours[first].time);
  return `Rain likely from ${start} until ${end}${amount}`;
}

/** US AQI in words, EPA bands. */
export function aqiWords(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

async function getJson(url: URL, what: string): Promise<unknown> {
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`The ${what} service answered ${res.status}`);
  return res.json();
}

/** Weather now, the next 12 hours of rain, and air quality at a point. Air quality is optional; weather is not. */
export async function getForecast([lng, lat]: LngLat): Promise<Forecast> {
  const f = new URL(FORECAST);
  f.searchParams.set("latitude", lat.toFixed(4));
  f.searchParams.set("longitude", lng.toFixed(4));
  f.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,relative_humidity_2m");
  f.searchParams.set("hourly", "precipitation_probability,precipitation");
  f.searchParams.set("forecast_hours", "12");
  f.searchParams.set("temperature_unit", "fahrenheit");
  f.searchParams.set("wind_speed_unit", "mph");
  f.searchParams.set("precipitation_unit", "inch");
  f.searchParams.set("timezone", TZ);
  const a = new URL(AIR);
  a.searchParams.set("latitude", lat.toFixed(4));
  a.searchParams.set("longitude", lng.toFixed(4));
  a.searchParams.set("current", "us_aqi");
  a.searchParams.set("timezone", TZ);

  const [fb, ab] = await Promise.all([getJson(f, "weather"), getJson(a, "air quality").catch(() => null)]);
  const w = ForecastBody.parse(fb);
  const air = AirBody.safeParse(ab);
  return {
    tempF: Math.round(w.current.temperature_2m),
    feelsF: Math.round(w.current.apparent_temperature),
    code: w.current.weather_code,
    windMph: Math.round(w.current.wind_speed_10m),
    humidity: Math.round(w.current.relative_humidity_2m),
    hours: w.hourly.time.map((time, i) => ({
      time,
      chance: w.hourly.precipitation_probability[i] ?? 0,
      inches: w.hourly.precipitation[i] ?? 0,
    })),
    aqi: air.success ? air.data.current.us_aqi : null,
  };
}
