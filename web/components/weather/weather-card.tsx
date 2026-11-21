"use client";

import { useEffect, useState } from "react";
import { aqiWords, getForecast, hourWords, rainWindow, weatherWords, type Forecast } from "@/lib/forecast";
import { Group } from "@/components/ui/surface";
import type { LngLat } from "@/lib/types";

/** Refresh while the app stays open: Open-Meteo updates every 15 minutes. */
const REFRESH_MS = 15 * 60_000;
/** Last answer per place, so switching cards in the sheet shows it at once instead of reloading. */
const recent = new Map<string, { at: number; forecast: Forecast }>();

function aqiTone(aqi: number): string {
  if (aqi <= 50) return "bg-safe/15 text-safe";
  if (aqi <= 100) return "bg-warn/15 text-warn";
  return "bg-late/15 text-late";
}

/** Right now and the next 12 hours: temperature, when it rains, and air quality. */
export function WeatherCard({ position }: { position: LngLat }) {
  const [open, setOpen] = useState(false);
  const key = position.join(",");
  const [state, setState] = useState<{ key: string; forecast: Forecast | null; failed: boolean } | null>(() => {
    const hit = recent.get(key);
    return hit && Date.now() - hit.at < REFRESH_MS ? { key, forecast: hit.forecast, failed: false } : null;
  });

  useEffect(() => {
    let stale = false;
    const load = () =>
      getForecast(position).then(
        (forecast) => {
          recent.set(key, { at: Date.now(), forecast });
          if (!stale) setState({ key, forecast, failed: false });
        },
        () => !stale && setState((s) => ({ key, forecast: s?.key === key ? s.forecast : null, failed: true })),
      );
    void load();
    const t = window.setInterval(load, REFRESH_MS);
    return () => {
      stale = true;
      window.clearInterval(t);
    };
    // key stands for position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const f = state?.key === key ? state.forecast : null;
  const failed = state?.key === key && state.failed && !f;

  return (
    <Group title="Weather now">
      {failed ? (
        <p className="px-4 py-3 text-subhead text-label-2">Weather is unavailable right now.</p>
      ) : !f ? (
        <div className="space-y-2 px-4 py-3" aria-busy>
          <div className="shimmer h-7 w-32 rounded-md" />
          <div className="shimmer h-12 w-full rounded-md" />
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="swap-in block w-full px-4 py-3 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{f.tempF}°</p>
              <p className="mt-1 text-subhead text-label-2">
                {weatherWords(f.code)} · feels {f.feelsF}° · wind {f.windMph} mph
              </p>
            </div>
            {f.aqi !== null && (
              <p className={`shrink-0 rounded-full px-2.5 py-1 text-footnote font-semibold ${aqiTone(f.aqi)}`}>
                Air {Math.round(f.aqi)} · {aqiWords(f.aqi)}
              </p>
            )}
          </div>

          <p className="mt-3 text-subhead font-medium">{rainWindow(f.hours)}</p>
          {/* Chance of rain per hour, next 12 hours. */}
          <div className="mt-2 flex h-12 items-end gap-1" role="img" aria-label={`Chance of rain by hour: ${f.hours.map((h) => `${hourWords(h.time)} ${h.chance}%`).join(", ")}`}>
            {f.hours.map((h, i) => (
              <span
                key={h.time}
                className="grow-y flex-1 rounded-t-[3px] bg-tint"
                style={{ height: `${Math.max(4, h.chance)}%`, opacity: 0.35 + (h.chance / 100) * 0.65, ["--i" as string]: i }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[0.6875rem] tabular-nums text-label-3">
            {f.hours.filter((_, i) => i % 3 === 0).map((h) => (
              <span key={h.time}>{hourWords(h.time)}</span>
            ))}
          </div>
          {open && (
            <div className="rise-in mt-3 border-t border-separator pt-3">
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div><dt className="text-[0.6875rem] text-label-2">Humidity</dt><dd className="text-headline font-semibold tabular-nums">{f.humidity}%</dd></div>
                <div><dt className="text-[0.6875rem] text-label-2">Wind</dt><dd className="text-headline font-semibold tabular-nums">{f.windMph} mph</dd></div>
                <div><dt className="text-[0.6875rem] text-label-2">Air (US AQI)</dt><dd className="text-headline font-semibold tabular-nums">{f.aqi === null ? "–" : Math.round(f.aqi)}</dd></div>
              </dl>
              {f.aqi !== null && (
                <p className="mt-2 text-footnote text-label-2">
                  {f.aqi <= 50 ? "Air is clean: fine for everyone outdoors." : f.aqi <= 100 ? "Acceptable; people very sensitive to pollution may want to limit long effort outside." : "Sensitive groups (asthma, heart conditions, children, older adults) should limit time outside."}
                </p>
              )}
              <ul className="mt-3 divide-y divide-separator">
                {f.hours.map((h) => (
                  <li key={h.time} className="flex items-center justify-between py-1.5 text-subhead tabular-nums">
                    <span className="w-14">{hourWords(h.time)}</span>
                    <span className="flex flex-1 items-center gap-2 px-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
                        <span className="block h-full rounded-full bg-tint" style={{ width: `${h.chance}%` }} />
                      </span>
                      <span className="w-10 text-right text-label-2">{h.chance}%</span>
                    </span>
                    <span className="w-16 text-right">{h.inches >= 0.01 ? `${h.inches.toFixed(2)} in` : "–"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 flex justify-between text-[0.6875rem] text-label-3">
            <span>Forecast by Open-Meteo. Warnings: National Weather Service.</span>
            <span className="font-medium text-tint">{open ? "Less" : "Hourly"}</span>
          </p>
        </button>
      )}
    </Group>
  );
}
