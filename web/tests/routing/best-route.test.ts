// Task 3: time-aware best route. Car, 100-year storm, pump off.
// Car closing hours: segment 1 (1-2) hour 12; segments 2 (3-4), 3 (4-5) hour 1; segments 8 (2-5), 11 (5-8) hour 9.
//   From junction 2 to junction 8 at hour 0: straight down 2-5-8, 600 m at 25 mph = 53.7 s -> rounds up to 1 minute.
//   Leaving at hour 8.99 (36 s before 9): 2-5 takes 27 s, so 5-8 would be entered fine but finished after hour 9.
//   The route must avoid it: 2-1-4-7-8 (all open), 1200 m at 25 mph + 300 m at 40 mph = 124.2 s -> rounds up to 3 minutes.
//   Leaving at hour 12: both roads out of junction 2 have closed -> no route.
import { beforeAll, describe, expect, it } from "vitest";
import { loadRoadGraph, loadScenarioLevels, loadSegments } from "@/lib/routing/data";
import { computeClosingHours } from "@/lib/routing/closing-hours";
import { findRoute } from "@/lib/routing/best-route";
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

const line = (nodes: number[]) => nodes.map((n) => nodePosition(graph, n));

describe("best route", () => {
  it("takes the direct road while it is open", () => {
    expect(findRoute(graph, hours.car, "car", 2, 8, 0)).toEqual({ kind: "ok", line: line([2, 5, 8]), minutes: 1 });
  });

  it("avoids a road that closes before you get to the end of it", () => {
    expect(findRoute(graph, hours.car, "car", 2, 8, 8.99)).toEqual({ kind: "ok", line: line([2, 1, 4, 7, 8]), minutes: 3 });
  });

  it("returns no_route when every way out has closed", () => {
    expect(findRoute(graph, hours.car, "car", 2, 8, 12)).toEqual({ kind: "no_route" });
  });

  it("a high-water vehicle still gets through at hour 12", () => {
    expect(findRoute(graph, hours.high_water, "high_water", 2, 8, 12).kind).toBe("ok");
  });

  it("start and end on the same junction is a zero-minute route", () => {
    expect(findRoute(graph, hours.car, "car", 4, 4, 3)).toEqual({ kind: "ok", line: line([4]), minutes: 0 });
  });
});
