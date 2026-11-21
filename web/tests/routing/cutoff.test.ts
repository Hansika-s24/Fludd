// Task 4a: cut-off time, max-min (widest path) search. Car, 100-year storm, pump off.
// Dry ground = junctions whose roads never close for a car: 0, 6 and 7.
//   Junction 2: best way out is 2-1 (closes hour 12) then 1-0 (never). Bottleneck 12 -> last open hour 11.
//   Junction 5: 5-4 closes hour 1; 5-2 and 5-8 close hour 9 -> bottleneck 9 -> last open hour 8.
//   Junction 4: 4-7 never closes and 7 is dry -> never cut off (null).
import { beforeAll, describe, expect, it } from "vitest";
import { loadRoadGraph, loadScenarioLevels, loadSegments } from "@/lib/routing/data";
import { computeClosingHours, dryNodes } from "@/lib/routing/closing-hours";
import { cutoffFor } from "@/lib/routing/cutoff";
import type { RoadGraph } from "@/lib/routing/graph";
import type { ClosingHours } from "@/lib/types";
import { useToyFixture } from "./toy-reader";

let graph: RoadGraph;
let hours: ClosingHours;
beforeAll(async () => {
  useToyFixture();
  graph = await loadRoadGraph();
  hours = computeClosingHours(await loadSegments(), await loadScenarioLevels("100yr", "off"));
});

describe("cut-off time", () => {
  it("finds the dry junctions for a car", () => {
    expect(dryNodes(graph, hours.car)).toEqual([0, 6, 7]);
  });

  it("junction 2 is cut off after hour 11", () => {
    expect(cutoffFor(graph, hours.car, 2)).toEqual({ kind: "ok", lastHour: 11 });
  });

  it("junction 5 is cut off after hour 8", () => {
    expect(cutoffFor(graph, hours.car, 5)).toEqual({ kind: "ok", lastHour: 8 });
  });

  it("junctions on or next to dry ground are never cut off", () => {
    expect(cutoffFor(graph, hours.car, 4)).toEqual({ kind: "ok", lastHour: null });
    expect(cutoffFor(graph, hours.car, 0)).toEqual({ kind: "ok", lastHour: null });
  });
});
