// Web Worker entry: runs the routing searches off the main thread so the map never stalls.
// Receives { id, name, args }, calls the matching engine function, and posts back { id, ok, result }.
import * as engine from "./engine";
import type { RoutingCall, WorkerReply, WorkerRequest } from "./messages";

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(reply: WorkerReply): void;
}
const scope = self as unknown as WorkerScope;

function run(call: RoutingCall): Promise<unknown> {
  switch (call.name) {
    case "closingHours":
      return engine.closingHours(...call.args);
    case "bestRoute":
      return engine.bestRoute(...call.args);
    case "cutoffTime":
      return engine.cutoffTime(...call.args);
    case "rescueReach":
      return engine.rescueReach(...call.args);
    case "latestDeparture":
      return engine.latestDeparture(...call.args);
  }
}

scope.onmessage = async (event) => {
  const { id, call } = event.data;
  try {
    scope.postMessage({ id, ok: true, result: await run(call) });
  } catch (error) {
    scope.postMessage({ id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
};
