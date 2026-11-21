"use client";

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

export function StormControls({ scenario, pump, hour, hours, hourZero, onScenario, onPump, onHour }: StormControlsProps) {
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
            className={`pressable h-9 rounded-[calc(var(--radius-control)-2px)] text-footnote font-medium
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
        <input
          id="hour"
          type="range"
          min={0}
          max={hours - 1}
          step={1}
          value={hour}
          onChange={(e) => onHour(Number(e.target.value))}
          className="mt-2 h-11 w-full accent-tint"
        />
      </div>
    </div>
  );
}
