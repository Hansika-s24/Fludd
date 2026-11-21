// Task 2: closing hour per segment per vehicle class.
// Hand check, 100-year storm, pump off (levels/100yr-pump-off.json):
//   segment 8 sits in bowl 2, lowest ground 12.64 m. Bowl 2 is 12.77 m at hour 8 (0.13 m deep, under the car's
//   0.15 m) and 13.16 m at hour 9 (0.52 m). So it closes at hour 9 for car, foot, SUV and fire engine.
//   High-water vehicle (0.75 m) needs 13.39 m: hour 10 (13.50 m).
//   segment 1 (bowl 2, 13.67 m): 13.78 at hour 11 (0.11 m), 13.99 at hour 12 (0.32 m) -> hour 12; peak 14.16 -> never for high-water.
//   segment 0 (bowl 1, 13.89 m): bowl 1 never rises above 12 m -> never.
//   segment 3 crosses both bowls; bowl 2 side (9.36 m) is 0.40 m deep at hour 1 -> hour 1 for car.
import { beforeAll, describe, expect, it } from "vitest";
import { loadScenarioLevels, loadSegments } from "@/lib/routing/data";
import { computeClosingHours, NEVER, VEHICLE_LIMITS_M } from "@/lib/routing/closing-hours";
import type { ClosingHours } from "@/lib/types";
import { useToyFixture } from "./toy-reader";

let hours: ClosingHours;
beforeAll(async () => {
  useToyFixture();
  hours = computeClosingHours(await loadSegments(), await loadScenarioLevels("100yr", "off"));
});

describe("closing hours", () => {
  it("uses the contract's vehicle limits", () => {
    expect(VEHICLE_LIMITS_M).toEqual({ foot: 0.3, car: 0.15, suv: 0.3, fire_engine: 0.25, high_water: 0.75 });
  });

  it("gives one Uint16 entry per segment for every class", () => {
    for (const c of ["foot", "car", "suv", "fire_engine", "high_water"] as const) {
      expect(hours[c]).toBeInstanceOf(Uint16Array);
      expect(hours[c]).toHaveLength(12);
    }
  });

  it("closes segment 8 at hour 9 for a car and hour 10 for a high-water vehicle", () => {
    expect(hours.car[8]).toBe(9);
    expect(hours.fire_engine[8]).toBe(9);
    expect(hours.high_water[8]).toBe(10);
  });

  it("closes segment 1 at hour 12, never for a high-water vehicle", () => {
    expect(hours.car[1]).toBe(12);
    expect(hours.high_water[1]).toBe(NEVER);
  });

  it("never closes segment 0, and uses the deeper bowl for segment 3", () => {
    expect(hours.car[0]).toBe(NEVER);
    expect(hours.car[3]).toBe(1);
  });

  it("matches the whole car column", () => {
    expect([...hours.car]).toEqual([NEVER, 12, 1, 1, NEVER, NEVER, NEVER, NEVER, 9, NEVER, NEVER, 9]);
  });
});
