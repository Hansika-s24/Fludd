"use client";

import { useEffect, useState } from "react";
import { STORM_WORDS } from "@/components/ui/storm-words";
import { SCENARIOS, type Hour, type PumpState, type Scenario } from "@/lib/types";

const STORMS = SCENARIOS.map((key) => ({ key, label: STORM_WORDS[key].short }));

/** "Sat 2 pm" from hour zero plus whole hours. */
export function clockLabel(hourZero: string, hour: Hour): string {
  const t = new Date(Date.parse(hourZero) + hour * 3_600_000);
  return t.toLocaleString("en-US", { weekday: "short", hour: "numeric", timeZone: "America/New_York" }).replace("AM", "am").replace("PM", "pm");
}

export interface StormControlsProps {
  scenario: Scenario;
  pump: PumpState;
  hour: Hour;
  hours: number;
  /** null until the manifest loads */
  hourZero: string | null;
  onScenario: (s: Scenario) => void;
  onPump: (p: PumpState) => void;
  onHour: (h: Hour) => void;
}

/** One storm hour per step while playing: 48 hours in about 20 seconds. */
const STEP_MS = 420;

export function StormControls({ scenario, pump, hour, hours, hourZero, onScenario, onPump, onHour }: StormControlsProps) {
  const [playing, setPlaying] = useState(false);
  const last = hours - 1;
  // Play the storm: step the hour until the end, then stop. Each step repaints the water on the map.
  useEffect(() => {
    if (!playing) return;
    if (hour >= last) {
      const done = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => onHour(hour + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, hour, last, onHour]);

  return (
    <div className="space-y-3 px-4 py-3">
      <div role="radiogroup" aria-label="Storm" className="grid grid-cols-5 gap-0.5 rounded-[var(--radius-control)] bg-fill p-0.5">
        {STORMS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={scenario === s.key}
            onClick={() => onScenario(s.key)}
            className={`pressable h-11 whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] text-footnote font-medium
              ${scenario === s.key ? "bg-group text-label shadow-[var(--shadow-control)]" : "text-label-2"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 text-subhead">
        <span>Pump stations have power</span>
        <input
          type="checkbox"
          role="switch"
          checked={pump === "on"}
          onChange={(e) => onPump(e.target.checked ? "on" : "off")}
          className="switch"
        />
      </label>

      <div>
        <div className="flex items-baseline justify-between text-subhead">
          <label htmlFor="hour">Time</label>
          <output htmlFor="hour" className="font-medium tabular-nums">
            {hourZero ? `${clockLabel(hourZero, hour)} · ` : ""}hour {hour}
          </output>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            aria-label={playing ? "Pause the storm" : "Play the storm"}
            aria-pressed={playing}
            onClick={() => {
              if (!playing && hour >= last) onHour(0);
              setPlaying((p) => !p);
            }}
            className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-tint text-white"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M4 2.5v11a.8.8 0 0 0 1.2.7l9-5.5a.8.8 0 0 0 0-1.4l-9-5.5A.8.8 0 0 0 4 2.5Z" /></svg>
            )}
          </button>
          <input
            id="hour"
            type="range"
            min={0}
            max={last}
            step={1}
            value={hour}
            onChange={(e) => {
              setPlaying(false);
              onHour(Number(e.target.value));
            }}
            className="h-11 min-w-0 flex-1 accent-tint"
          />
        </div>
      </div>
    </div>
  );
}
