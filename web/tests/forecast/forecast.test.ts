import { afterEach, describe, expect, it, vi } from "vitest";
import { aqiWords, briefText, getForecast, hourWords, rainWindow, weatherWords, type HourRain } from "@/lib/forecast";

const h = (hour: number, chance: number, inches = 0): HourRain => ({ time: `2026-11-21T${String(hour).padStart(2, "0")}:00`, chance, inches });

afterEach(() => vi.unstubAllGlobals());

describe("rainWindow", () => {
  it("names the first run of likely-rain hours and how much falls", () => {
    expect(rainWindow([h(15, 10), h(16, 60, 0.1), h(17, 80, 0.3), h(18, 20)])).toBe("Rain likely from 4 pm until 6 pm, about 0.4 in");
  });
  it("says now when it is already raining", () => {
    expect(rainWindow([h(15, 90, 0.01), h(16, 30)])).toBe("Rain likely from now until 4 pm");
  });
  it("says unlikely with the peak chance, or none at all", () => {
    expect(rainWindow([h(15, 10), h(16, 30)])).toBe("Rain unlikely in the next 2 hours (at most 30% chance)");
    expect(rainWindow([h(15, 0), h(16, 0)])).toBe("No rain expected in the next 2 hours");
  });
});

describe("words", () => {
  it("turns codes, hours and AQI into plain words", () => {
    expect(weatherWords(0)).toBe("Clear");
    expect(weatherWords(55)).toBe("Drizzle");
    expect(weatherWords(82)).toBe("Heavy rain");
    expect(weatherWords(95)).toBe("Thunderstorms");
    expect(hourWords("2026-11-21T00:00")).toBe("12 am");
    expect(hourWords("2026-11-21T12:00")).toBe("12 pm");
    expect(aqiWords(42)).toBe("Good");
    expect(aqiWords(120)).toBe("Unhealthy for sensitive groups");
  });
});

describe("getForecast", () => {
  it("reads Open-Meteo weather and air quality into one forecast", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      const url = new URL(u);
      const body = url.host.startsWith("air-quality")
        ? { current: { us_aqi: 37 } }
        : {
          current: { time: "2026-11-21T15:00", temperature_2m: 73.9, apparent_temperature: 79.6, weather_code: 61, precipitation: 0.01, wind_speed_10m: 5.6, relative_humidity_2m: 88 },
          hourly: { time: ["2026-11-21T15:00", "2026-11-21T16:00"], precipitation_probability: [70, null], precipitation: [0.05, null] },
        };
      return new Response(JSON.stringify(body));
    }));
    const f = await getForecast([-82.41, 28.06]);
    expect(f).toMatchObject({ tempF: 74, feelsF: 80, code: 61, windMph: 6, humidity: 88, aqi: 37 });
    expect(f.hours).toEqual([h(15, 70, 0.05), h(16, 0, 0)]);
  });

  it("still answers when air quality is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) =>
      new URL(u).host.startsWith("air-quality")
        ? new Response("{}", { status: 503 })
        : new Response(JSON.stringify({
          current: { time: "t", temperature_2m: 70, apparent_temperature: 70, weather_code: 0, precipitation: 0, wind_speed_10m: 0, relative_humidity_2m: 50 },
          hourly: { time: [], precipitation_probability: [], precipitation: [] },
        }))));
    expect((await getForecast([-82.41, 28.06])).aqi).toBeNull();
  });
});

describe("briefText", () => {
  const f = { tempF: 74, feelsF: 80, code: 61, windMph: 6, humidity: 88, aqi: 37, hours: [h(15, 70, 0.2), h(16, 10)] };
  it("leads with alerts and ends with the floodwater warning when there are any", () => {
    expect(briefText(f, ["Flood Watch", "Flood Watch"])).toBe(
      "Weather Service alert: Flood Watch. Rain likely from now until 4 pm, about 0.2 in. Now 74° and rain, feels 80°. Air quality good (37). Never drive or walk into floodwater.",
    );
  });
  it("is just weather on a quiet day", () => {
    expect(briefText({ ...f, aqi: null, hours: [h(15, 0)] }, [])).toBe("No rain expected in the next 1 hours. Now 74° and rain, feels 80°.");
  });
});
