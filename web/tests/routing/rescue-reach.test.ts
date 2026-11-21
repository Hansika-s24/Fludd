// Task 4b: rescue reach, one search from all fire stations at once. Fire engine (0.25 m), 100-year, pump off.
// The toy fire station snaps to junction 0. Fire-engine closing hours equal the car's here:
//   segment 1 hour 12, segments 2 and 3 hour 1, segments 8 and 11 hour 9, the rest never.
//   Junction 2: reached via 0-1-2, bottleneck segment 1 (hour 12) -> until hour 11.
//   Junction 5: every way in closes by hour 9 -> until hour 8.
//   Roads reachable at hour 10: everything still open and joined to the station: 0, 1, 4, 5, 6, 7, 9, 10.
//   At hour 12 segment 1 has closed too.
import { beforeAll, describe, expect, it } from "vitest";
import { loadFireStations, loadRoadGraph, loadScenarioLevels, loadSegments } from "@/lib/routing/data";
import { computeClosingHours } from "@/lib/routing/closing-hours";
import { nearestNode, type RoadGraph } from "@/lib/routing/graph";
import { rescueReachFrom } from "@/lib/routing/rescue-reach";
import type { ClosingHours } from "@/lib/types";
import { useToyFixture } from "./toy-reader";

let graph: RoadGraph;
let hours: ClosingHours;
let stations: number[];
beforeAll(async () => {
  useToyFixture();
  graph = await loadRoadGraph();
  hours = computeClosingHours(await loadSegments(), await loadScenarioLevels("100yr", "off"));
  stations = (await loadFireStations()).map((p) => nearestNode(graph, p));
});

describe("rescue reach", () => {
  it("snaps the toy fire station to junction 0", () => {
    expect(stations).toEqual([0]);
  });

  it("reaches junction 2 until hour 11", () => {
    expect(rescueReachFrom(graph, hours.fire_engine, stations, 2, 10)).toEqual({
      kind: "ok", untilHour: 11, reachableSegmentIds: [0, 1, 4, 5, 6, 7, 9, 10],
    });
  });

  it("reaches junction 5 until hour 8", () => {
    expect(rescueReachFrom(graph, hours.fire_engine, stations, 5, 10)).toMatchObject({ kind: "ok", untilHour: 8 });
  });

  it("loses segment 1 at hour 12", () => {
    const at12 = rescueReachFrom(graph, hours.fire_engine, stations, 2, 12);
    expect(at12).toMatchObject({ reachableSegmentIds: [0, 4, 5, 6, 7, 9, 10] });
  });

  it("reaches every road at hour 0, and the station's own junction is never cut off", () => {
    expect(rescueReachFrom(graph, hours.fire_engine, stations, 0, 0)).toEqual({
      kind: "ok", untilHour: null, reachableSegmentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    });
  });
});
