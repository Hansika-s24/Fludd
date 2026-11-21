// A small stand-in for the Supabase browser client. No network.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Call = [method: string, ...args: unknown[]];

export interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

export interface ChangePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface FakeChannel {
  name: string;
  filter: unknown;
  listener: ((payload: ChangePayload) => void) | null;
  subscribed: boolean;
}

export interface FakeState {
  tables: Record<string, QueryResult>;
  queries: { table: string; calls: Call[] }[];
  channels: FakeChannel[];
  removed: FakeChannel[];
  signIn: { error: { message: string } | null };
  signInCalls: { email: string; password: string }[];
  rpc: QueryResult;
  rpcCalls: string[];
  session: { access_token: string } | null;
  signOutCalls: number;
  signedUrlCalls: { bucket: string; paths: string[]; expiresIn: number }[];
}

export function makeFake(): { client: SupabaseClient; state: FakeState } {
  const state: FakeState = {
    tables: {},
    queries: [],
    channels: [],
    removed: [],
    signIn: { error: null },
    signInCalls: [],
    rpc: { data: true, error: null },
    rpcCalls: [],
    session: { access_token: "token-123" },
    signOutCalls: 0,
    signedUrlCalls: [],
  };

  const from = (table: string) => {
    const calls: Call[] = [];
    state.queries.push({ table, calls });
    const result = (): QueryResult => state.tables[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "order", "eq", "not", "is", "limit"]) {
      builder[m] = (...args: unknown[]) => {
        calls.push([m, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (r: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject);
    return builder;
  };

  const channel = (name: string) => {
    const ch: FakeChannel = { name, filter: null, listener: null, subscribed: false };
    state.channels.push(ch);
    const api = {
      on: (_type: string, filter: unknown, listener: (p: ChangePayload) => void) => {
        ch.filter = filter;
        ch.listener = listener;
        return api;
      },
      subscribe: () => {
        ch.subscribed = true;
        return api;
      },
      __fake: ch,
    };
    return api;
  };

  const client = {
    from,
    channel,
    removeChannel: async (api: { __fake: FakeChannel }) => {
      state.removed.push(api.__fake);
      return "ok";
    },
    rpc: async (fn: string) => {
      state.rpcCalls.push(fn);
      return state.rpc;
    },
    auth: {
      signInWithPassword: async (creds: { email: string; password: string }) => {
        state.signInCalls.push(creds);
        return { data: {}, error: state.signIn.error };
      },
      getSession: async () => ({ data: { session: state.session }, error: null }),
      signOut: async () => {
        state.signOutCalls += 1;
        state.session = null;
        return { error: null };
      },
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUrls: async (paths: string[], expiresIn: number) => {
          state.signedUrlCalls.push({ bucket, paths, expiresIn });
          return {
            data: paths.map((p) => ({ path: p, signedUrl: `https://signed.example/${p}`, error: null })),
            error: null,
          };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient, state };
}

/** Lets pending promise callbacks run. */
export const flush = () => new Promise<void>((r) => setTimeout(r, 0));
