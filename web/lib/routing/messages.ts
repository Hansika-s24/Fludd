// The messages passed between index.ts (page side) and worker.ts (worker side). Types only.
import type * as engine from "./engine";

type Engine = typeof engine;

/** One call to a contract function: its name and exactly its arguments. */
export type RoutingCall = { [Name in keyof Engine]: { name: Name; args: Parameters<Engine[Name]> } }[keyof Engine];

export interface WorkerRequest {
  id: number;
  call: RoutingCall;
}

export type WorkerReply = { id: number; ok: true; result: unknown } | { id: number; ok: false; message: string };
