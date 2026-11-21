// Browser-side Supabase functions, against a fake client. No network.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { flush, makeFake, type FakeState } from "./fakeClient";

let current: SupabaseClient | null = null;
vi.mock("@/lib/supabase/client", () => ({
  getBrowserClient: () => current,
  isSupabaseConfigured: () => current !== null,
}));

const { subscribeApprovedReports, adminSignIn, adminAccessToken, adminSignOut, getQueue, getCalibration } =
  await import("@/lib/supabase");

let state: FakeState;
beforeEach(() => {
  const fake = makeFake();
  current = fake.client;
  state = fake.state;
});

const row = (id: string, createdAt: string, depth = 0.2) => ({
  id,
  lng: -82.41,
  lat: 28.06,
  depth_m: depth,
  source: "gps",
  created_at: createdAt,
});

describe("subscribeApprovedReports", () => {
  it("fetches public_reports newest first and maps them to PublicReport", async () => {
    state.tables.public_reports = {
      data: [row("b", "2026-11-21T12:00:00Z", 0.3), row("a", "2026-11-21T11:00:00Z")],
      error: null,
    };
    const onChange = vi.fn();
    subscribeApprovedReports(onChange);
    await flush();
    expect(state.queries[0].table).toBe("public_reports");
    expect(state.queries[0].calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      { id: "b", position: [-82.41, 28.06], depthM: 0.3, createdAt: "2026-11-21T12:00:00Z", source: "gps" },
      { id: "a", position: [-82.41, 28.06], depthM: 0.2, createdAt: "2026-11-21T11:00:00Z", source: "gps" },
    ]);
  });

  it("subscribes to every change on public.public_reports after the first fetch", async () => {
    subscribeApprovedReports(vi.fn());
    await flush();
    expect(state.channels).toHaveLength(1);
    expect(state.channels[0].filter).toEqual({ event: "*", schema: "public", table: "public_reports" });
    expect(state.channels[0].subscribed).toBe(true);
  });

  it("calls back with the full updated list on insert, update and delete", async () => {
    state.tables.public_reports = { data: [row("a", "2026-11-21T11:00:00Z")], error: null };
    const onChange = vi.fn();
    subscribeApprovedReports(onChange);
    await flush();
    const emit = state.channels[0].listener!;

    emit({ eventType: "INSERT", new: row("b", "2026-11-21T12:00:00Z", 0.5), old: {} });
    expect(onChange.mock.lastCall![0].map((r: { id: string }) => r.id)).toEqual(["b", "a"]);

    emit({ eventType: "UPDATE", new: row("a", "2026-11-21T11:00:00Z", 0.4), old: { id: "a" } });
    const afterUpdate = onChange.mock.lastCall![0];
    expect(afterUpdate).toHaveLength(2);
    expect(afterUpdate[1].depthM).toBe(0.4);

    emit({ eventType: "DELETE", new: {}, old: { id: "b" } });
    expect(onChange.mock.lastCall![0].map((r: { id: string }) => r.id)).toEqual(["a"]);
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("unsubscribe removes the channel", async () => {
    const stop = subscribeApprovedReports(vi.fn());
    await flush();
    stop();
    expect(state.removed).toEqual([state.channels[0]]);
  });

  it("never subscribes when unsubscribed before the first fetch finishes", async () => {
    const onChange = vi.fn();
    const stop = subscribeApprovedReports(onChange);
    stop();
    await flush();
    expect(state.channels).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls back with an empty list when the fetch fails, and still listens", async () => {
    state.tables.public_reports = { data: null, error: { message: "boom" } };
    const onChange = vi.fn();
    subscribeApprovedReports(onChange);
    await flush();
    expect(onChange).toHaveBeenCalledWith([]);
    expect(state.channels).toHaveLength(1);
  });

  it("calls back once with [] and returns a no-op when Supabase is not configured", async () => {
    current = null;
    const onChange = vi.fn();
    const stop = subscribeApprovedReports(onChange);
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(() => stop()).not.toThrow();
  });
});

describe("adminSignIn", () => {
  it("signs in with the password and asks is_admin", async () => {
    state.rpc = { data: true, error: null };
    expect(await adminSignIn("a@b.c", "pw")).toEqual({ isAdmin: true });
    expect(state.signInCalls).toEqual([{ email: "a@b.c", password: "pw" }]);
    expect(state.rpcCalls).toEqual(["is_admin"]);
  });

  it("returns isAdmin false for a signed-in user who is not an admin", async () => {
    state.rpc = { data: false, error: null };
    expect(await adminSignIn("a@b.c", "pw")).toEqual({ isAdmin: false });
  });

  it("returns isAdmin false on a wrong password without throwing or asking is_admin", async () => {
    state.signIn = { error: { message: "Invalid login credentials" } };
    expect(await adminSignIn("a@b.c", "wrong")).toEqual({ isAdmin: false });
    expect(state.rpcCalls).toEqual([]);
  });

  it("returns isAdmin false when is_admin fails", async () => {
    state.rpc = { data: null, error: { message: "boom" } };
    expect(await adminSignIn("a@b.c", "pw")).toEqual({ isAdmin: false });
  });

  it("returns isAdmin false when Supabase is not configured", async () => {
    current = null;
    expect(await adminSignIn("a@b.c", "pw")).toEqual({ isAdmin: false });
  });
});

describe("adminAccessToken and adminSignOut", () => {
  it("gives the session's access token", async () => {
    expect(await adminAccessToken()).toBe("token-123");
  });

  it("gives null with no session, and after sign-out", async () => {
    await adminSignOut();
    expect(state.signOutCalls).toBe(1);
    expect(await adminAccessToken()).toBeNull();
  });

  it("gives null and signs out quietly when Supabase is not configured", async () => {
    current = null;
    expect(await adminAccessToken()).toBeNull();
    await expect(adminSignOut()).resolves.toBeUndefined();
  });
});

const waiting = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  created_at: "2026-11-21T11:40:00Z",
  exact_lng: -82.4115,
  exact_lat: 28.0593,
  photo_path: `${id}.jpg`,
  ai_reading: { waterPresent: true, depthRangeM: [0.15, 0.3], reference: "car tyre", confidence: 0.7 },
  model_depth_m: 0.22,
  ...extra,
});

describe("getQueue", () => {
  it("selects waiting reports oldest first and maps them to QueueItem", async () => {
    state.tables.reports = { data: [waiting("q1")], error: null };
    const queue = await getQueue();
    const q = state.queries[0];
    expect(q.table).toBe("reports");
    expect(q.calls).toContainEqual(["eq", "status", "waiting"]);
    expect(q.calls).toContainEqual(["order", "created_at", { ascending: true }]);
    expect(queue).toEqual([
      {
        id: "q1",
        photoUrl: "https://signed.example/q1.jpg",
        exactPosition: [-82.4115, 28.0593],
        aiReading: { waterPresent: true, depthRangeM: [0.15, 0.3], reference: "car tyre", confidence: 0.7 },
        modelDepthM: 0.22,
        createdAt: "2026-11-21T11:40:00Z",
      },
    ]);
  });

  it("signs photo links for one hour from the private report-photos bucket", async () => {
    state.tables.reports = { data: [waiting("q1"), waiting("q2")], error: null };
    await getQueue();
    expect(state.signedUrlCalls).toEqual([{ bucket: "report-photos", paths: ["q1.jpg", "q2.jpg"], expiresIn: 3600 }]);
  });

  it("uses the manual-review reading when the AI reading is missing, and 0 for a missing model depth", async () => {
    state.tables.reports = { data: [waiting("q1", { ai_reading: null, model_depth_m: null })], error: null };
    const [item] = await getQueue();
    expect(item.aiReading).toEqual({
      waterPresent: false,
      depthRangeM: [0, 0],
      reference: "reading unavailable",
      confidence: 0,
    });
    expect(item.modelDepthM).toBe(0);
  });

  it("returns an empty queue without signing anything when nothing is waiting", async () => {
    state.tables.reports = { data: [], error: null };
    expect(await getQueue()).toEqual([]);
    expect(state.signedUrlCalls).toEqual([]);
  });

  it("throws when the query fails", async () => {
    state.tables.reports = { data: null, error: { message: "boom" } };
    await expect(getQueue()).rejects.toThrow(/boom/);
  });

  it("returns an empty queue when Supabase is not configured", async () => {
    current = null;
    expect(await getQueue()).toEqual([]);
  });
});

describe("getCalibration", () => {
  it("pairs model and confirmed depths of approved reports and rounds the error to the centimetre", async () => {
    state.tables.reports = {
      data: [
        { model_depth_m: 0.22, final_depth_m: 0.25 },
        { model_depth_m: 0.4, final_depth_m: 0.3 },
        { model_depth_m: null, final_depth_m: 0.3 },
      ],
      error: null,
    };
    const cal = await getCalibration();
    const q = state.queries[0];
    expect(q.table).toBe("reports");
    expect(q.calls).toContainEqual(["eq", "status", "approved"]);
    expect(cal.pairs).toEqual([
      { modelM: 0.22, confirmedM: 0.25 },
      { modelM: 0.4, confirmedM: 0.3 },
    ]);
    // (0.03 + 0.10) / 2 = 0.065 -> 0.07
    expect(cal.meanAbsErrorM).toBe(0.07);
  });

  it("gives 0 error with no pairs", async () => {
    state.tables.reports = { data: [], error: null };
    expect(await getCalibration()).toEqual({ pairs: [], meanAbsErrorM: 0 });
  });

  it("throws when the query fails", async () => {
    state.tables.reports = { data: null, error: { message: "boom" } };
    await expect(getCalibration()).rejects.toThrow(/boom/);
  });

  it("gives no pairs when Supabase is not configured", async () => {
    current = null;
    expect(await getCalibration()).toEqual({ pairs: [], meanAbsErrorM: 0 });
  });
});
