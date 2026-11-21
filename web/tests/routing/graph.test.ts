// Task 1: the road graph loads into CSR arrays and plain Dijkstra finds a hand-checkable shortest path.
// Toy grid (node numbers):   0 - 1 - 2      horizontal segments are 18 cells x 25 m = 450 m
//                            |   |   |      vertical segments are 12 cells x 25 m = 300 m
//                            3 - 4 - 5      segments 3 (4-5) and 10 (4-7) are 40 mph arterials, the rest 25 mph
//                            |   |   |
//                            6 - 7 - 8
import { beforeAll, describe, expect, it } from "vitest";
import { loadRoadGraph } from "@/lib/routing/data";
import { nearestNode, type RoadGraph } from "@/lib/routing/graph";
import { shortestPath } from "@/lib/routing/shortest-path";
import { nodePosition, useToyFixture } from "./toy-reader";

let graph: RoadGraph;
beforeAll(async () => {
  useToyFixture();
  graph = await loadRoadGraph();
});

describe("road graph", () => {
  it("loads 9 junctions and 12 segments into CSR arrays, each segment usable both ways", () => {
    expect(graph.nodeCount).toBe(9);
    expect(graph.segmentCount).toBe(12);
    expect(graph.firstLink).toHaveLength(10);
    expect(graph.linkTarget).toHaveLength(24);
    // Junction 4 (the centre) touches segments 2, 3, 7 and 10.
    const centre = [...graph.linkSegment.subarray(graph.firstLink[4], graph.firstLink[5])].sort((a, b) => a - b);
    expect(centre).toEqual([2, 3, 7, 10]);
  });

  it("reads lengths and speeds", () => {
    expect(graph.segmentLengthM[0]).toBe(450);
    expect(graph.segmentLengthM[6]).toBe(300);
    expect(graph.segmentSpeedMps[0]).toBeCloseTo(25 * 0.44704, 5); // 25 mph
    expect(graph.segmentSpeedMps[3]).toBeCloseTo(40 * 0.44704, 5); // 40 mph
  });

  it("snaps a position to the nearest junction", () => {
    expect(nearestNode(graph, nodePosition(graph, 5))).toBe(5);
    expect(nearestNode(graph, [-82.4185, 28.0628])).toBe(0);
  });

  it("finds the shortest path by length: 0 to 2 is 0-1-2, 900 m", () => {
    const path = shortestPath(graph, 0, 2, (s) => graph.segmentLengthM[s]);
    expect(path).toEqual({ nodes: [0, 1, 2], cost: 900 });
  });

  it("finds the shortest path by length: 0 to 8 is 1500 m", () => {
    expect(shortestPath(graph, 0, 8, (s) => graph.segmentLengthM[s])?.cost).toBe(1500);
  });
});
