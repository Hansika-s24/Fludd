// POST /api/reports logic with a fake store and fake photo reader; snapping and depth use the toy fixture.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiReading, PhotoReader } from "@/lib/gemini/photo";
import { clearServerDataCache, loadManifestFromDisk, miltonPeakDepthM } from "@/lib/reports/data";
import { handleReportUpload } from "@/lib/reports/intake";
import { snapToRoad } from "@/lib/reports/snap";
import type { LngLat, Manifest } from "@/lib/types";
import { fakeStore, jpegWithExif, type FakeStore } from "./fake-store";

const ID = "11111111-2222-4333-8444-555555555555";
const reading: AiReading = { waterPresent: true, depthRangeM: [0.1, 0.25], reference: "curb", confidence: 0.7 };

let bbox: Manifest["bbox"];
let inside: LngLat;
beforeAll(async () => {
  clearServerDataCache();
  bbox = (await loadManifestFromDisk()).bbox;
  inside = [(bbox[0] + bbox[2]) / 2 + 0.0007, (bbox[1] + bbox[3]) / 2 - 0.0003];
});

function form(fields: Record<string, string | Blob | undefined>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v instanceof Blob) fd.append(k, v, k === "photo" ? "photo.jpg" : k);
    else fd.append(k, v);
  }
  return new Request("http://localhost/api/reports", { method: "POST", body: fd });
}
const photoBlob = (bytes = jpegWithExif(), type = "image/jpeg") => new Blob([new Uint8Array(bytes)], { type });

const okReader = (): PhotoReader & { read: ReturnType<typeof vi.fn> } => {
  const read = vi.fn(async () => reading);
  return { name: "fake", read };
};

let store: FakeStore;
beforeEach(() => {
  store = fakeStore();
});

describe("POST /api/reports logic", () => {
  it("stores a stripped photo, a snapped public position and the reading, and answers 201", async () => {
    const reader = okReader();
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(inside[1]), lng: String(inside[0]), source: "gps", takenAt: "2026-11-21T14:02:00-05:00" }),
      { store, photoReader: reader, newId: () => ID },
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, status: "waiting", aiReading: reading });

    const stored = store.photos.get(`${ID}.jpg`);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(Buffer.from(stored!.bytes).includes(Buffer.from("GPS"))).toBe(false);
    expect(Buffer.from(stored!.bytes).includes(Buffer.from("Exif"))).toBe(false);

    // Gemini saw the stripped bytes, inline as base64 with the mime type.
    const sent = reader.read.mock.calls[0][0] as { base64: string; mimeType: string };
    expect(sent.mimeType).toBe("image/jpeg");
    expect(Buffer.from(sent.base64, "base64").equals(Buffer.from(stored!.bytes))).toBe(true);

    const row = store.reports.get(ID)!;
    expect(row).toMatchObject({
      exact_lng: inside[0], exact_lat: inside[1], position_source: "gps", photo_path: `${ID}.jpg`,
      ai_reading: reading, ai_status: "read", taken_at: "2026-11-21T19:02:00.000Z",
    });
    const snapped = await snapToRoad(inside);
    expect([row.public_lng, row.public_lat]).toEqual(snapped);
    expect([row.public_lng, row.public_lat]).not.toEqual(inside);
    expect(row.model_depth_m).toBe(await miltonPeakDepthM(inside));
  });

  it("accepts a plain Shortcut-style upload: no source, no takenAt, octet-stream photo", async () => {
    const res = await handleReportUpload(
      form({ photo: photoBlob(jpegWithExif(), "application/octet-stream"), lat: ` ${inside[1]} `, lng: String(inside[0]) }),
      { store, photoReader: okReader(), newId: () => ID },
    );
    expect(res.status).toBe(201);
    expect(store.reports.get(ID)).toMatchObject({ position_source: "pin", taken_at: null });
  });

  it("stores the report with ai_status unavailable when Gemini fails (429, timeout, off-schema)", async () => {
    const reader: PhotoReader = {
      name: "fake",
      read: async () => {
        throw Object.assign(new Error("rate limited"), { status: 429 });
      },
    };
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: reader, newId: () => ID },
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, status: "waiting", aiReading: null });
    expect(store.reports.get(ID)).toMatchObject({ ai_reading: null, ai_status: "unavailable" });
  });

  it("stores the report with ai_status unavailable when AI is off", async () => {
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: null, newId: () => ID },
    );
    expect(res.status).toBe(201);
    expect(store.reports.get(ID)?.ai_status).toBe("unavailable");
  });

  it.each([
    ["missing lat", (p: LngLat) => ({ lng: String(p[0]) })],
    ["non-numeric lat", (p: LngLat) => ({ lat: "north", lng: String(p[0]) })],
    ["bad source", (p: LngLat) => ({ lat: String(p[1]), lng: String(p[0]), source: "satellite" })],
    ["bad takenAt", (p: LngLat) => ({ lat: String(p[1]), lng: String(p[0]), takenAt: "yesterday-ish" })],
  ])("refuses %s with 400", async (_label, fields) => {
    const res = await handleReportUpload(form({ photo: photoBlob(), ...fields(inside) }), {
      store, photoReader: okReader(), newId: () => ID,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("bad_request");
    expect(store.calls).toEqual([]);
  });

  it("refuses a missing photo with 400", async () => {
    const res = await handleReportUpload(form({ lat: String(inside[1]), lng: String(inside[0]) }), { store, photoReader: null });
    expect(res.status).toBe(400);
  });

  it("refuses a position outside the manifest box with 400", async () => {
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(bbox[3] + 0.01), lng: String(inside[0]) }),
      { store, photoReader: okReader() },
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("outside_area");
    expect(store.calls).toEqual([]);
  });

  it("refuses a HEIC or GIF photo with 415", async () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);
    const res = await handleReportUpload(
      form({ photo: photoBlob(gif, "image/gif"), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: okReader() },
    );
    expect(res.status).toBe(415);
    expect(store.calls).toEqual([]);
  });

  it("refuses a photo over 10 MB with 413", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(jpegWithExif());
    const res = await handleReportUpload(
      form({ photo: photoBlob(big), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: okReader() },
    );
    expect(res.status).toBe(413);
  });

  it("refuses a request that is not a form with 400", async () => {
    const res = await handleReportUpload(
      new Request("http://localhost/api/reports", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }),
      { store, photoReader: null },
    );
    expect(res.status).toBe(400);
  });

  it("answers 502 and stores nothing when the photo upload fails", async () => {
    store.failUpload = true;
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: okReader(), newId: () => ID },
    );
    expect(res.status).toBe(502);
    expect(store.reports.size).toBe(0);
  });

  it("removes the uploaded photo when the row insert fails", async () => {
    store.failInsert = true;
    const res = await handleReportUpload(
      form({ photo: photoBlob(), lat: String(inside[1]), lng: String(inside[0]) }),
      { store, photoReader: okReader(), newId: () => ID },
    );
    expect(res.status).toBe(502);
    expect(store.photos.size).toBe(0);
    expect(store.calls).toContain("removePhoto");
  });
});
