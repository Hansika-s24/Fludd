// Browser-side Supabase functions for the approved-reports feed, admin sign-in, queue and calibration.
// Uses only the anon key through the shared browser client; admin powers come from RLS + is_admin().
import type { Calibration, LngLat, PublicReport, QueueItem } from "@/lib/types";
import { getBrowserClient } from "@/lib/supabase/client";

const PHOTO_BUCKET = "report-photos";
const PHOTO_LINK_SECONDS = 60 * 60;

// ---------- Approved reports feed ----------

interface PublicReportRow {
  id: string;
  lng: number;
  lat: number;
  depth_m: number;
  source: "gps" | "pin";
  created_at: string;
}

function toPublicReport(r: PublicReportRow): PublicReport {
  return { id: r.id, position: [r.lng, r.lat], depthM: r.depth_m, createdAt: r.created_at, source: r.source };
}

const newestFirst = (a: PublicReport, b: PublicReport) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

interface ChangePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Partial<PublicReportRow>;
  old: Partial<PublicReportRow>;
}

/**
 * Calls back with all approved reports (newest first), then again with the full updated list on
 * every insert, update or delete. Returns the unsubscribe function.
 * Not configured: calls back once with [] and returns a no-op.
 */
export function subscribeApprovedReports(onChange: (reports: PublicReport[]) => void): () => void {
  const supabase = getBrowserClient();
  if (!supabase) {
    onChange([]);
    return () => {};
  }

  const byId = new Map<string, PublicReport>();
  const emit = () => onChange([...byId.values()].sort(newestFirst));
  let stopped = false;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const applyChange = (p: ChangePayload) => {
    if (p.eventType === "DELETE") {
      if (p.old.id) byId.delete(p.old.id);
    } else if (p.new.id) {
      byId.set(p.new.id, toPublicReport(p.new as PublicReportRow));
    }
    emit();
  };

  void (async () => {
    const { data, error } = await supabase
      .from("public_reports")
      .select("id, lng, lat, depth_m, source, created_at")
      .order("created_at", { ascending: false });
    if (stopped) return;
    // A failed first fetch shows an empty map; live changes still arrive.
    if (!error && data) for (const r of data as PublicReportRow[]) byId.set(r.id, toPublicReport(r));
    emit();

    channel = supabase
      .channel("public_reports_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "public_reports" }, (payload) =>
        applyChange(payload as unknown as ChangePayload),
      )
      .subscribe();
  })();

  return () => {
    stopped = true;
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };
}

// ---------- Admin sign-in ----------

/** Signs in and reports whether the user is an admin. A wrong password gives { isAdmin: false }. */
export async function adminSignIn(email: string, password: string): Promise<{ isAdmin: boolean }> {
  const supabase = getBrowserClient();
  if (!supabase) return { isAdmin: false };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { isAdmin: false };
  const { data, error: rpcError } = await supabase.rpc("is_admin");
  return { isAdmin: !rpcError && data === true };
}

/** The signed-in user's access token, for `Authorization: Bearer <token>` on admin routes; null if signed out. */
export async function adminAccessToken(): Promise<string | null> {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Signs the admin out. Does nothing when Supabase is not configured. */
export async function adminSignOut(): Promise<void> {
  const supabase = getBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ---------- Moderation queue ----------

type AiReading = QueueItem["aiReading"];

// Shown when Gemini could not read the photo: the admin must judge the depth by eye (manual review).
const READING_UNAVAILABLE: AiReading = {
  waterPresent: false,
  depthRangeM: [0, 0],
  reference: "reading unavailable",
  confidence: 0,
};

interface QueueRow {
  id: string;
  created_at: string;
  exact_lng: number;
  exact_lat: number;
  photo_path: string;
  ai_reading: unknown;
  model_depth_m: number | null;
}

function toAiReading(v: unknown): AiReading {
  if (typeof v !== "object" || v === null) return READING_UNAVAILABLE;
  const r = v as Record<string, unknown>;
  const range = r.depthRangeM;
  if (
    typeof r.waterPresent !== "boolean" ||
    !Array.isArray(range) ||
    range.length !== 2 ||
    typeof range[0] !== "number" ||
    typeof range[1] !== "number" ||
    typeof r.reference !== "string" ||
    typeof r.confidence !== "number"
  ) {
    return READING_UNAVAILABLE;
  }
  return {
    waterPresent: r.waterPresent,
    depthRangeM: [range[0], range[1]],
    reference: r.reference,
    confidence: r.confidence,
  };
}

/** Waiting reports, oldest first, for the signed-in admin. Throws if the query fails. */
export async function getQueue(): Promise<QueueItem[]> {
  const supabase = getBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reports")
    .select("id, created_at, exact_lng, exact_lat, photo_path, ai_reading, model_depth_m")
    .eq("status", "waiting")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load the queue: ${error.message}`);
  const rows = (data ?? []) as QueueRow[];
  if (rows.length === 0) return [];

  const urls = new Map<string, string>();
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.photo_path), PHOTO_LINK_SECONDS);
  for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);

  return rows.map((r) => ({
    id: r.id,
    photoUrl: urls.get(r.photo_path) ?? "",
    exactPosition: [r.exact_lng, r.exact_lat] as LngLat,
    aiReading: toAiReading(r.ai_reading),
    modelDepthM: r.model_depth_m ?? 0,
    createdAt: r.created_at,
  }));
}

// ---------- Calibration ----------

interface CalibrationRow {
  model_depth_m: number | null;
  final_depth_m: number | null;
}

/** Model vs confirmed depth for approved reports, and the mean absolute error to the centimetre. */
export async function getCalibration(): Promise<Calibration> {
  const supabase = getBrowserClient();
  if (!supabase) return { pairs: [], meanAbsErrorM: 0 };
  const { data, error } = await supabase
    .from("reports")
    .select("model_depth_m, final_depth_m")
    .eq("status", "approved")
    .not("model_depth_m", "is", null)
    .not("final_depth_m", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load calibration: ${error.message}`);

  const pairs: Calibration["pairs"] = [];
  for (const r of (data ?? []) as CalibrationRow[]) {
    if (r.model_depth_m !== null && r.final_depth_m !== null) {
      pairs.push({ modelM: r.model_depth_m, confirmedM: r.final_depth_m });
    }
  }
  if (pairs.length === 0) return { pairs, meanAbsErrorM: 0 };
  const mean = pairs.reduce((s, p) => s + Math.abs(p.modelM - p.confirmedM), 0) / pairs.length;
  return { pairs, meanAbsErrorM: Math.round(mean * 100) / 100 };
}
