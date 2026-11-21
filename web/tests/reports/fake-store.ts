// Test helper: an in-memory ReportStore that records every call.
import type { LogRow, NewReportRow, PublicReportRow, ReportPatch, ReportStore, ReportSummaryRow } from "@/lib/reports/store";

export interface FakeStore extends ReportStore {
  photos: Map<string, { bytes: Uint8Array; contentType: string }>;
  reports: Map<string, NewReportRow & { status: ReportSummaryRow["status"]; final_depth_m: number | null; decided_at: string | null }>;
  log: LogRow[];
  approved: PublicReportRow[];
  tokens: Map<string, string>;
  admins: Set<string>;
  failUpload: boolean;
  failInsert: boolean;
  calls: string[];
}

export function fakeStore(): FakeStore {
  const s: FakeStore = {
    photos: new Map(),
    reports: new Map(),
    log: [],
    approved: [],
    tokens: new Map(),
    admins: new Set(),
    failUpload: false,
    failInsert: false,
    calls: [],
    async uploadPhoto(path, bytes, contentType) {
      s.calls.push("uploadPhoto");
      if (s.failUpload) throw new Error("upload failed");
      s.photos.set(path, { bytes, contentType });
    },
    async removePhoto(path) {
      s.calls.push("removePhoto");
      s.photos.delete(path);
    },
    async insertReport(row) {
      s.calls.push("insertReport");
      if (s.failInsert) throw new Error("insert failed");
      s.reports.set(row.id, { ...row, status: "waiting", final_depth_m: null, decided_at: null });
    },
    async getReport(id) {
      s.calls.push("getReport");
      const r = s.reports.get(id);
      if (!r) return null;
      return { id: r.id, status: r.status, ai_reading: r.ai_reading, final_depth_m: r.final_depth_m, decided_at: r.decided_at };
    },
    async updateReport(id, patch: ReportPatch) {
      s.calls.push("updateReport");
      const r = s.reports.get(id);
      if (!r) throw new Error("no row");
      Object.assign(r, patch);
      return { id: r.id, status: r.status, ai_reading: r.ai_reading, final_depth_m: r.final_depth_m, decided_at: r.decided_at };
    },
    async insertLog(row) {
      s.calls.push("insertLog");
      s.log.push(row);
    },
    async listApproved(limit) {
      s.calls.push("listApproved");
      return s.approved.slice(0, limit);
    },
    async userIdForToken(token) {
      return s.tokens.get(token) ?? null;
    },
    async isAdmin(userId) {
      return s.admins.has(userId);
    },
  };
  return s;
}

/** A tiny valid JPEG with an EXIF APP1 segment carrying a fake GPS string. */
export function jpegWithExif(): Uint8Array {
  const seg = (marker: number, payload: number[]) => {
    const len = payload.length + 2;
    return [0xff, marker, len >> 8, len & 0xff, ...payload];
  };
  const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0));
  return new Uint8Array([
    0xff, 0xd8,
    ...seg(0xe1, [...ascii("Exif"), 0, 0, ...ascii("GPS 28.0596N")]),
    ...seg(0xdb, [0, 1, 2, 3]),
    ...seg(0xda, [1, 1, 0, 0, 63, 0]),
    0x12, 0x34,
    0xff, 0xd9,
  ]);
}
