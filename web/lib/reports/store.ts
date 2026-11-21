// Server only. Every read and write the report routes make, behind one interface so the logic can be
// tested with a fake. The Supabase version checks each row it reads with zod (no generated DB types).
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AiReading } from "@/lib/gemini/photo";

export const PHOTO_BUCKET = "report-photos";

/** A new row in public.reports (snake_case as in the migration). */
export interface NewReportRow {
  id: string;
  taken_at: string | null;
  exact_lng: number;
  exact_lat: number;
  public_lng: number;
  public_lat: number;
  position_source: "gps" | "pin";
  photo_path: string;
  ai_reading: AiReading | null;
  ai_status: "read" | "unavailable";
  model_depth_m: number | null;
}

const reportRow = z.object({
  id: z.string(),
  status: z.enum(["waiting", "approved", "rejected"]),
  ai_reading: z
    .object({ depthRangeM: z.tuple([z.number(), z.number()]) })
    .loose()
    .nullable(),
  final_depth_m: z.number().nullable(),
  decided_at: z.string().nullable(),
});
export type ReportSummaryRow = z.infer<typeof reportRow>;
const REPORT_COLUMNS = "id, status, ai_reading, final_depth_m, decided_at";

export interface ReportPatch {
  status: "approved" | "rejected";
  final_depth_m: number | null;
  decided_at: string;
}

export interface LogRow {
  report_id: string;
  admin_id: string;
  decision: "approve" | "edit" | "reject";
  depth_m: number | null;
}

const publicRow = z.object({
  id: z.string(),
  lng: z.number(),
  lat: z.number(),
  depth_m: z.number(),
  source: z.enum(["gps", "pin"]),
  created_at: z.string(),
});
export type PublicReportRow = z.infer<typeof publicRow>;

export interface ReportStore {
  uploadPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  removePhoto(path: string): Promise<void>;
  insertReport(row: NewReportRow): Promise<void>;
  getReport(id: string): Promise<ReportSummaryRow | null>;
  updateReport(id: string, patch: ReportPatch): Promise<ReportSummaryRow>;
  insertLog(row: LogRow): Promise<void>;
  /** Through the anon client: only what row-level security shows the public. */
  listApproved(limit: number): Promise<PublicReportRow[]>;
  /** The user id behind a Supabase access token, or null if it is not valid. */
  userIdForToken(token: string): Promise<string | null>;
  isAdmin(userId: string): Promise<boolean>;
}

/** Error text without request details, so nothing secret reaches the logs. */
function fail(what: string, err: { message?: string; code?: string } | null): Error {
  return new Error(`${what} failed${err?.code ? ` (${err.code})` : ""}${err?.message ? `: ${err.message}` : ""}`);
}

export function supabaseStore(clients: { service: () => SupabaseClient; anon: () => SupabaseClient }): ReportStore {
  let serviceClient: SupabaseClient | null = null;
  let anonClient: SupabaseClient | null = null;
  const service = () => (serviceClient ??= clients.service());
  const anon = () => (anonClient ??= clients.anon());

  return {
    async uploadPhoto(path, bytes, contentType) {
      const { error } = await service().storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (error) throw fail("photo upload", error);
    },
    async removePhoto(path) {
      const { error } = await service().storage.from(PHOTO_BUCKET).remove([path]);
      if (error) throw fail("photo removal", error);
    },
    async insertReport(row) {
      const { error } = await service().from("reports").insert(row);
      if (error) throw fail("report insert", error);
    },
    async getReport(id) {
      const { data, error } = await service().from("reports").select(REPORT_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw fail("report read", error);
      return data === null ? null : reportRow.parse(data);
    },
    async updateReport(id, patch) {
      const { data, error } = await service().from("reports").update(patch).eq("id", id).select(REPORT_COLUMNS).single();
      if (error) throw fail("report update", error);
      return reportRow.parse(data);
    },
    async insertLog(row) {
      const { error } = await service().from("moderation_log").insert(row);
      if (error) throw fail("moderation log insert", error);
    },
    async listApproved(limit) {
      const { data, error } = await anon()
        .from("public_reports")
        .select("id, lng, lat, depth_m, source, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw fail("approved reports read", error);
      return z.array(publicRow).parse(data ?? []);
    },
    async userIdForToken(token) {
      const { data, error } = await service().auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
    async isAdmin(userId) {
      const { data, error } = await service().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (error) throw fail("admin check", error);
      return data !== null;
    },
  };
}
