// Task 4c: "move your car by", searched backwards from dry parking. Car, 100-year storm, pump off.
// Dry parking = junctions whose roads never close for a car: 0, 6, 7.
// A car parked at a junction is treated as at risk once any road touching that junction closes.
//   Junction 2: its roads close at hours 12 (to 1) and 9 (to 5), so the car is at risk from hour 9.
//     Driving 2-1-0 stays possible until just before hour 12. Move by hour 8, to junction 0.
//   Junction 1: road 1-2 closes at hour 12; 1-0 never closes. Move by hour 11, to junction 0.
//   Junction 5: road 5-4 closes at hour 1. Move by hour 0; the way still open goes 5-8-7, to junction 7.
//   Junction 7: dry already. No move needed: null hour, no parking suggestion.
import { beforeAll, describe, expect, it } from "vitest";
import { loadRoadGraph, loadScenarioLevels, loadSegments } from "@/lib/routing/data";
import { computeClosingHours } from "@/lib/routing/closing-hours";
import { latestDepartureFor } from "@/lib/routing/latest-departure";
import type { RoadGraph } from "@/lib/routing/graph";
import type { ClosingHours } from "@/lib/types";
import { nodePosition, useToyFixture } from "./toy-reader";

let graph: RoadGraph;
let hours: ClosingHours;
beforeAll(async () => {
  useToyFixture();
  graph = await loadRoadGraph();
  hours = computeClosingHours(await loadSegments(), await loadScenarioLevels("100yr", "off"));
});

const parkingAt = (node: number) => ({ name: `High ground at junction ${node}`, position: nodePosition(graph, node) });

describe("latest departure", () => {
  it("junction 2: move by hour 8, to junction 0", () => {
    expect(latestDepartureFor(graph, hours.car, 2)).toEqual({ kind: "ok", moveByHour: 8, parking: parkingAt(0) });
  });

  it("junction 1: move by hour 11, to junction 0", () => {
    expect(latestDepartureFor(graph, hours.car, 1)).toEqual({ kind: "ok", moveByHour: 11, parking: parkingAt(0) });
  });

  it("junction 5: move by hour 0, to junction 7", () => {
    expect(latestDepartureFor(graph, hours.car, 5)).toEqual({ kind: "ok", moveByHour: 0, parking: parkingAt(7) });
  });

  it("junction 7 is dry: no move needed", () => {
    expect(latestDepartureFor(graph, hours.car, 7)).toEqual({ kind: "ok", moveByHour: null, parking: null });
  });
});
