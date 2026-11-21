// Moderation and the approved feed, with a fake store.
import { beforeEach, describe, expect, it } from "vitest";
import { handleApprovedFeed } from "@/lib/reports/feed";
import { handleModerate } from "@/lib/reports/moderate";
import type { NewReportRow } from "@/lib/reports/store";
import { fakeStore, type FakeStore } from "./fake-store";

const ID = "11111111-2222-4333-8444-555555555555";
const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
const USER = "bbbbbbbb-0000-4000-8000-000000000002";
const NOW = new Date("2026-11-21T17:00:00.000Z");

function row(aiReading: NewReportRow["ai_reading"]): NewReportRow {
  return {
    id: ID, taken_at: null, exact_lng: -82.41, exact_lat: 28.06, public_lng: -82.411, public_lat: 28.061,
    position_source: "gps", photo_path: `${ID}.jpg`, ai_reading: aiReading,
    ai_status: aiReading ? "read" : "unavailable", model_depth_m: 0.2,
  };
}

function req(body: unknown, token: string | null = "admin-token"): Request {
  return new Request(`http://localhost/api/reports/${ID}/moderate`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

let store: FakeStore;
beforeEach(async () => {
  store = fakeStore();
  store.tokens.set("admin-token", ADMIN);
  store.tokens.set("user-token", USER);
  store.admins.add(ADMIN);
  await store.insertReport(row({ waterPresent: true, depthRangeM: [0.1, 0.3], reference: "curb", confidence: 0.6 }));
  store.calls.length = 0;
});

const moderate = (r: Request, id = ID) => handleModerate(r, id, { store, now: () => NOW });

describe("POST /api/reports/[id]/moderate logic", () => {
  it("401 without a bearer token", async () => {
    const res = await moderate(req({ decision: "approve" }, null));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unauthorized");
  });

  it("401 with a token Supabase does not recognise", async () => {
    expect((await moderate(req({ decision: "approve" }, "expired"))).status).toBe(401);
  });

  it("403 for a signed-in user who is not an admin", async () => {
    const res = await moderate(req({ decision: "approve", depthM: 0.2 }, "user-token"));
    expect(res.status).toBe(403);
    expect(store.log).toEqual([]);
  });

  it("approves with the given depth, logs it, and answers the summary", async () => {
    const res = await moderate(req({ decision: "approve", depthM: 0.22 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: ID, status: "approved", finalDepthM: 0.22 });
    expect(store.reports.get(ID)).toMatchObject({ status: "approved", final_depth_m: 0.22, decided_at: NOW.toISOString() });
    expect(store.log).toEqual([{ report_id: ID, admin_id: ADMIN, decision: "approve", depth_m: 0.22 }]);
    expect(store.calls.indexOf("insertLog")).toBeLessThan(store.calls.indexOf("updateReport"));
  });

  it("approves with the midpoint of the AI reading when no depth is given", async () => {
    const res = await moderate(req({ decision: "approve" }));
    expect(((await res.json()) as { finalDepthM: number }).finalDepthM).toBeCloseTo(0.2, 12);
  });

  it("400 when approving with no depth and no AI reading", async () => {
    store.reports.clear();
    await store.insertReport(row(null));
    const res = await moderate(req({ decision: "approve" }));
    expect(res.status).toBe(400);
    expect(store.log).toEqual([]);
  });

  it("edit needs a depth and approves with it", async () => {
    expect((await moderate(req({ decision: "edit" }))).status).toBe(400);
    const res = await moderate(req({ decision: "edit", depthM: 0.4 }));
    expect(await res.json()).toEqual({ id: ID, status: "approved", finalDepthM: 0.4 });
    expect(store.log.at(-1)).toEqual({ report_id: ID, admin_id: ADMIN, decision: "edit", depth_m: 0.4 });
  });

  it("rejects with no depth", async () => {
    const res = await moderate(req({ decision: "reject", depthM: 0.4 }));
    expect(await res.json()).toEqual({ id: ID, status: "rejected", finalDepthM: null });
    expect(store.reports.get(ID)).toMatchObject({ status: "rejected", final_depth_m: null });
    expect(store.log.at(-1)).toMatchObject({ decision: "reject", depth_m: null });
  });

  it.each([
    ["unknown decision", { decision: "maybe" }],
    ["depth over 5 m", { decision: "edit", depthM: 6 }],
    ["negative depth", { decision: "approve", depthM: -1 }],
    ["string depth", { decision: "approve", depthM: "0.2" }],
  ])("400 for %s", async (_label, body) => {
    expect((await moderate(req(body))).status).toBe(400);
  });

  it("404 for an unknown or malformed id", async () => {
    expect((await moderate(req({ decision: "reject" }), "22222222-2222-4222-8222-222222222222")).status).toBe(404);
    expect((await moderate(req({ decision: "reject" }), "not-a-uuid")).status).toBe(404);
  });
});

describe("GET /api/reports?status=approved logic", () => {
  it("answers PublicReport[] with [lng, lat] street positions", async () => {
    store.approved = [{ id: ID, lng: -82.411, lat: 28.061, depth_m: 0.2, source: "gps", created_at: "2026-11-21T16:00:00+00:00" }];
    const res = await handleApprovedFeed(new Request("http://localhost/api/reports?status=approved"), store);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reports: [{ id: ID, position: [-82.411, 28.061], depthM: 0.2, createdAt: "2026-11-21T16:00:00+00:00", source: "gps" }],
    });
  });

  it("400 for any other status", async () => {
    const res = await handleApprovedFeed(new Request("http://localhost/api/reports?status=waiting"), store);
    expect(res.status).toBe(400);
    expect(store.calls).toEqual([]);
  });

  it("502 in the error shape when the read fails", async () => {
    store.listApproved = async () => {
      throw new Error("down");
    };
    const res = await handleApprovedFeed(new Request("http://localhost/api/reports?status=approved"), store);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("storage_failed");
  });
});
