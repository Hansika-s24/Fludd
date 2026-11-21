// Live river and creek gauges near USF from the USGS Water Services API (no key, CORS allowed).
// Read in the browser every few minutes; nothing is stored.
import type { LngLat } from "@/lib/types";

export interface Gauge {
  id: string;
  name: string;
  position: LngLat;
  /** Gauge height in feet (USGS parameter 00065). */
  heightFt: number;
  /** Flow in cubic feet per second (00060), when the site reports it. */
  flowCfs: number | null;
  /** Local time of the reading, "4:30 pm". */
  at: string;
}

const URL_ =
  "https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=-82.56,27.92,-82.30,28.20&parameterCd=00065,00060&siteStatus=active";

interface Series {
  sourceInfo: { siteName: string; siteCode: { value: string }[]; geoLocation: { geogLocation: { latitude: number; longitude: number } } };
  variable: { variableCode: { value: string }[] };
  values: { value: { value: string; dateTime: string }[] }[];
}

/** "HILLSBOROUGH R AT FOWLER AV NEAR TEMPLE TERRACE FL" → "Hillsborough R At Fowler Av". */
function tidy(name: string): string {
  return name
    .replace(/\s+(NEAR|NR)\s+.*$/i, "")
    .replace(/\s+FL$/i, "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchGauges(): Promise<Gauge[]> {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`USGS answered ${res.status}`);
  const body = (await res.json()) as { value?: { timeSeries?: Series[] } };
  const sites = new Map<string, Gauge>();
  for (const t of body.value?.timeSeries ?? []) {
    const id = t.sourceInfo.siteCode[0]?.value;
    const last = t.values[0]?.value.at(-1);
    const n = last ? Number(last.value) : NaN;
    if (!id || !last || !Number.isFinite(n) || n < 0) continue;
    const g = t.sourceInfo.geoLocation.geogLocation;
    const site = sites.get(id) ?? {
      id,
      name: tidy(t.sourceInfo.siteName),
      position: [g.longitude, g.latitude] as LngLat,
      heightFt: NaN,
      flowCfs: null,
      at: new Date(last.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).toLowerCase(),
    };
    const code = t.variable.variableCode[0]?.value;
    if (code === "00065") site.heightFt = n;
    if (code === "00060") site.flowCfs = n;
    sites.set(id, site);
  }
  return [...sites.values()].filter((s) => Number.isFinite(s.heightFt));
}
