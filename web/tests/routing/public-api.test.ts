// The contract functions in lib/routing (docs/contracts.md "Exact names"), on the toy fixture.
// Outside a browser there is no Web Worker, so these run the engine directly: same answers either way.
// Positions are snapped to the nearest junction; positions outside the study box get "outside".
import { beforeAll, describe, expect, it } from "vitest";
import { bestRoute, closingHours, cutoffTime, latestDeparture, rescueReach } from "@/lib/routing";
import { loadRoadGraph } from "@/lib/routing/data";
import type { RoadGraph } from "@/lib/routing/graph";
import type { LngLat } from "@/lib/types";
import { nodePosition, useToyFixture } from "./toy-reader";

let graph: RoadGraph;
let at: (node: number) => LngLat;
const miami: LngLat = [-80.19, 25.76];

beforeAll(async () => {
  useToyFixture();
  graph = await loadRoadGraph();
  at = (node) => nodePosition(graph, node);
});

describe("routing contract functions", () => {
  it("closingHours: segment 8 closes for cars at hour 9 (100-year, pump off)", async () => {
    const hours = await closingHours("100yr", "off");
    expect(hours.car[8]).toBe(9);
    expect(hours.foot).toHaveLength(12);
  });

  it("closingHours: with the pump on, segment 8 never closes for cars (bowl 2 peaks at 12.72 m, 0.08 m over its 12.64 m)", async () => {
    expect((await closingHours("100yr", "on")).car[8]).toBe(65535);
  });

  it("bestRoute: snaps to junctions and avoids the road closing at hour 9", async () => {
    const near2: LngLat = [at(2)[0] + 0.0001, at(2)[1]];
    expect(await bestRoute(near2, at(8), "car", "100yr", "off", 8.99)).toEqual({
      kind: "ok", line: [2, 1, 4, 7, 8].map(at), minutes: 3,
    });
  });

  it("bestRoute: no route from outside the study area", async () => {
    expect(await bestRoute(miami, at(8), "car", "100yr", "off", 0)).toEqual({ kind: "no_route" });
  });

  it("cutoffTime: junction 2 is cut off after hour 11", async () => {
    expect(await cutoffTime(at(2), "car", "100yr", "off")).toEqual({ kind: "ok", lastHour: 11 });
    expect(await cutoffTime(miami, "car", "100yr", "off")).toEqual({ kind: "outside" });
  });

  it("rescueReach: the toy station reaches junction 2 until hour 11", async () => {
    expect(await rescueReach(at(2), "fire_engine", "100yr", "off", 10)).toEqual({
      kind: "ok", untilHour: 11, reachableSegmentIds: [0, 1, 4, 5, 6, 7, 9, 10],
    });
    expect(await rescueReach(miami, "fire_engine", "100yr", "off", 10)).toEqual({ kind: "outside" });
  });

  it("latestDeparture: move the car from junction 2 by hour 8, to junction 0", async () => {
    expect(await latestDeparture(at(2), "100yr", "off")).toEqual({
      kind: "ok", moveByHour: 8, parking: { name: "High ground at junction 0", position: at(0) },
    });
    expect(await latestDeparture(miami, "100yr", "off")).toEqual({ kind: "outside" });
  });
});
