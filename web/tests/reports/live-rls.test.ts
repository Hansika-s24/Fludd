// LIVE check against the real Supabase project. Skipped unless RUN_LIVE_SUPABASE=1.
// Reads keys from web/.env.local (never printed). Checks that the anon key cannot read reports, the
// moderation log or report photos, and that the service role can write and remove a labelled test report.
// Everything this test creates is removed again; the test report is never moderated, so it has no log row
// and its delete is not blocked by the moderation_log foreign key.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const LIVE = process.env.RUN_LIVE_SUPABASE === "1";
const BUCKET = "report-photos";
const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
/** Smallest valid PNG (1 x 1), only used as a test object. */
const PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex",
);

describe.skipIf(!LIVE)("live Supabase row-level security", () => {
  let anon: SupabaseClient;
  let service: SupabaseClient;
  const testId = crypto.randomUUID();
  const testPhoto = `live-rls-test-${testId}.png`;
  let photoUploaded = false;
  let reportInserted = false;

  beforeAll(async () => {
    const envFile = join(__dirname, "../../.env.local");
    if (existsSync(envFile)) process.loadEnvFile(envFile);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !anonKey || !serviceKey) throw new Error("Supabase settings missing from web/.env.local");
    anon = createClient(url, anonKey, NO_SESSION);
    service = createClient(url, serviceKey, NO_SESSION);

    const up = await service.storage.from(BUCKET).upload(testPhoto, PNG_1X1, { contentType: "image/png" });
    expect(up.error).toBeNull();
    photoUploaded = true;
  });

  afterAll(async () => {
    if (reportInserted) await service.from("reports").delete().eq("id", testId);
    if (photoUploaded) await service.storage.from(BUCKET).remove([testPhoto]);
  });

  it("anon cannot read reports", async () => {
    const { data, error } = await anon.from("reports").select("id, exact_lat, exact_lng").limit(5);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("anon cannot read the moderation log", async () => {
    const { data, error } = await anon.from("moderation_log").select("id").limit(5);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("anon cannot list or download report photos", async () => {
    const list = await anon.storage.from(BUCKET).list("", { limit: 10 });
    expect(list.error !== null || (list.data ?? []).length === 0).toBe(true);
    const download = await anon.storage.from(BUCKET).download(testPhoto);
    expect(download.data).toBeNull();
    expect(download.error).not.toBeNull();
  });

  it("anon cannot write reports", async () => {
    const { error } = await anon.from("reports").insert({
      exact_lng: -82.41, exact_lat: 28.06, public_lng: -82.41, public_lat: 28.06,
      position_source: "pin", photo_path: "anon-should-fail.png",
    });
    expect(error).not.toBeNull();
  });

  it("the service role inserts a labelled test report that the public never sees, then deletes it", async () => {
    const insert = await service.from("reports").insert({
      id: testId,
      exact_lng: -82.41, exact_lat: 28.06, public_lng: -82.41, public_lat: 28.06,
      position_source: "pin",
      photo_path: testPhoto,
      ai_reading: { waterPresent: false, depthRangeM: [0, 0], reference: "LIVE RLS TEST - delete me", confidence: 0 },
      ai_status: "read",
    });
    expect(insert.error).toBeNull();
    reportInserted = true;

    const seenByAnon = await anon.from("reports").select("id").eq("id", testId);
    expect(seenByAnon.error !== null || (seenByAnon.data ?? []).length === 0).toBe(true);
    const inPublic = await anon.from("public_reports").select("id").eq("id", testId);
    expect(inPublic.error).toBeNull();
    expect(inPublic.data).toEqual([]);

    const del = await service.from("reports").delete().eq("id", testId);
    expect(del.error).toBeNull();
    reportInserted = false;
    const gone = await service.from("reports").select("id").eq("id", testId);
    expect(gone.data).toEqual([]);
  });
});
