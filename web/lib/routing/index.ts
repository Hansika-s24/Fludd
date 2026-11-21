// Routing engine: the five functions the interface calls (names and types fixed in docs/contracts.md).
// In the browser each call is sent to a Web Worker (worker.ts) so the map never stalls; where no worker
// exists (server, tests) or it fails to start, the same engine code runs directly. Same answer either way.
// The searches themselves live one per file: best-route, cutoff, rescue-reach, latest-departure.
import type {
  ClosingHours, CutoffResult, Hour, LatestDeparture, LngLat, PumpState, RescueReach, RouteResult, Scenario, VehicleClass,
} from "@/lib/types";
import * as engine from "./engine";
import type { RoutingCall, WorkerReply, WorkerRequest } from "./messages";

class WorkerUnavailable extends Error {}

let worker: Worker | null | undefined; // undefined = not tried yet, null = none available
let nextId = 0;
const waiting = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  try {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      const pending = waiting.get(reply.id);
      if (!pending) return;
      waiting.delete(reply.id);
      if (reply.ok) pending.resolve(reply.result);
      else pending.reject(new Error(reply.message));
    };
    w.onerror = () => {
      // The worker failed to load or crashed: stop using it and let waiting calls run directly.
      worker = null;
      for (const pending of waiting.values()) pending.reject(new WorkerUnavailable());
      waiting.clear();
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** Sends the call to the worker, or runs it here when there is no worker. */
async function run<T>(call: RoutingCall, direct: () => Promise<T>): Promise<T> {
  const w = getWorker();
  if (!w) return direct();
  const id = nextId++;
  try {
    return await new Promise<T>((resolve, reject) => {
      waiting.set(id, { resolve: (result) => resolve(result as T), reject });
      const request: WorkerRequest = { id, call };
      w.postMessage(request);
    });
  } catch (error) {
    if (error instanceof WorkerUnavailable) return direct();
    throw error;
  }
}

/** For each road segment, the hour it closes for each vehicle class (65535 = never). */
export function closingHours(scenario: Scenario, pump: PumpState): Promise<ClosingHours> {
  return run({ name: "closingHours", args: [scenario, pump] }, () => engine.closingHours(scenario, pump));
}

/** Fastest route that only uses roads still open when you reach them; or no_route. */
export function bestRoute(
  from: LngLat, to: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState, startHour: Hour,
): Promise<RouteResult> {
  return run(
    { name: "bestRoute", args: [from, to, vehicle, scenario, pump, startHour] },
    () => engine.bestRoute(from, to, vehicle, scenario, pump, startHour),
  );
}

/** The last whole hour any route from the position to dry ground still exists (null = never cut off). */
export function cutoffTime(position: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState): Promise<CutoffResult> {
  return run({ name: "cutoffTime", args: [position, vehicle, scenario, pump] }, () => engine.cutoffTime(position, vehicle, scenario, pump));
}

/** Until what hour a fire station can reach the position, and the roads stations can reach at `hour`. */
export function rescueReach(
  position: LngLat, vehicle: VehicleClass, scenario: Scenario, pump: PumpState, hour: Hour,
): Promise<RescueReach> {
  return run(
    { name: "rescueReach", args: [position, vehicle, scenario, pump, hour] },
    () => engine.rescueReach(position, vehicle, scenario, pump, hour),
  );
}

/** "Move your car by" hour and the dry parking it leads to (null hour and parking = no move needed). */
export function latestDeparture(position: LngLat, scenario: Scenario, pump: PumpState, vehicle: VehicleClass = "car"): Promise<LatestDeparture> {
  return run({ name: "latestDeparture", args: [position, scenario, pump, vehicle] }, () => engine.latestDeparture(position, scenario, pump, vehicle));
}
