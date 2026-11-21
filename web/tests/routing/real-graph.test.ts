// Routing on the real road graph, through the same reader the browser uses (fetch from /data).
// Prints the answers and timings as a benchmark. Skipped when the real graph files are absent.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { LngLat } from "@/lib/types";
import { diskFetch } from "../data/fixture-fetch";

const dir = join(__dirname, "../../public/data");
const has = ["graph.json", "graph.bin", "segments.json", "manifest.json", "levels/100yr-pump-off.json", "levels/milton-pump-off.json"]
  .every((f) => existsSync(join(dir, f)));

const RUNS = 5;
// A recorded Milton flood-damage point in the University Area (same as tests/grade/real-smoke.test.ts)
const WET: LngLat = [-82.441134, 28.074075];

async function freshRouting(): Promise<typeof import("@/lib/routing")> {
  vi.resetModules();
  return import("@/lib/routing");
}

async function time<T>(run: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await run();
  return { result, ms: performance.now() - start };
}

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe.skipIf(!has)("routing on the real graph", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("answers closingHours and latestDeparture, and times them", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SET", "real");
    vi.stubGlobal("fetch", diskFetch());

    const coldClosing: number[] = [];
    const coldDeparture: number[] = [];
    const warmClosing: number[] = [];
    const warmDeparture: number[] = [];
    let routing = await freshRouting();
    for (let i = 0; i < RUNS; i++) {
      routing = await freshRouting(); // new modules: files read and closing hours computed again
      coldClosing.push((await time(() => routing.closingHours("100yr", "off"))).ms);
      coldDeparture.push((await time(() => routing.latestDeparture(WET, "milton", "off"))).ms);
    }
    for (let i = 0; i < RUNS; i++) {
      warmClosing.push((await time(() => routing.closingHours("100yr", "off"))).ms);
      warmDeparture.push((await time(() => routing.latestDeparture(WET, "milton", "off"))).ms);
    }

    const hours = await routing.closingHours("100yr", "off");
    const departure = await routing.latestDeparture(WET, "milton", "off");
    const { loadRoadGraph } = await import("@/lib/routing/data");
    const graph = await loadRoadGraph();

    expect(hours.car).toHaveLength(graph.segmentCount);
    const closesForCar = hours.car.filter((h) => h !== 65535).length;
    expect(departure.kind).toBe("ok");

    console.log(
      `real graph: ${graph.nodeCount} nodes, ${graph.segmentCount} segments\n` +
        `closingHours("100yr","off"): ${closesForCar} segments close for a car; ` +
        `cold median ${median(coldClosing).toFixed(1)} ms, warm median ${median(warmClosing).toFixed(2)} ms\n` +
        `latestDeparture(${WET.join(", ")}, "milton", "off"): ${JSON.stringify(departure)}; ` +
        `cold median ${median(coldDeparture).toFixed(1)} ms (after closingHours 100yr), warm median ${median(warmDeparture).toFixed(2)} ms`,
    );
  }, 120_000);
});
