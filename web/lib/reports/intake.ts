// Server only. POST /api/reports: a resident's photo and position.
// Multipart form fields (what the web form and the Apple Shortcut send):
//   photo    JPEG or PNG file, up to 10 MB (HEIC must be converted to JPEG first)
//   lat, lng decimal degrees, inside the study box
//   source   "gps" | "pin", default "pin"
//   takenAt  optional time the photo was taken, ISO 8601
// Answers 201 { id, status: "waiting", aiReading } with aiReading null when Gemini could not read it.
import { z } from "zod";
import { apiError } from "@/lib/api";
import { describeError } from "@/lib/gemini/gemini";
import type { AiReading, PhotoReader } from "@/lib/gemini/photo";
import type { LngLat, Manifest } from "@/lib/types";
import { insideBox, loadManifestFromDisk, miltonPeakDepthM } from "./data";
import { snapToRoad } from "./snap";
import { MAX_PHOTO_BYTES, PhotoError, stripMetadata } from "./strip";
import type { ReportStore } from "./store";

export interface IntakeDeps {
  store: ReportStore;
  photoReader: PhotoReader | null;
  newId?: () => string;
  studyBox?: () => Promise<Manifest["bbox"]>;
  snap?: (position: LngLat) => Promise<LngLat>;
  modelDepth?: (position: LngLat) => Promise<number | null>;
}

const blankToUndefined = (v: unknown) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v);

const coordinate = (name: string, min: number, max: number) =>
  z.preprocess(
    blankToUndefined,
    z
      .string({ error: `${name} is required` })
      .transform((s) => Number(s.trim()))
      .pipe(z.number({ error: `${name} must be a number` }).min(min).max(max)),
  );

const fieldsSchema = z.object({
  lat: coordinate("lat", -90, 90),
  lng: coordinate("lng", -180, 180),
  source: z.preprocess(
    (v) => {
      const b = blankToUndefined(v);
      return typeof b === "string" ? b.trim().toLowerCase() : b;
    },
    z.enum(["gps", "pin"], { error: 'source must be "gps" or "pin"' }).default("pin"),
  ),
  takenAt: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .refine((s) => !Number.isNaN(Date.parse(s)), "takenAt must be an ISO 8601 time")
      .transform((s) => new Date(s).toISOString())
      .optional(),
  ),
});

/** Room for the other form fields and multipart boundaries on top of the photo itself. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

export interface IntakeAnswer {
  id: string;
  status: "waiting";
  aiReading: AiReading | null;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

export async function handleReportUpload(request: Request, deps: IntakeDeps): Promise<Response> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_PHOTO_BYTES + FORM_OVERHEAD_BYTES) {
    return apiError(413, "too_large", "The photo is larger than 10 MB");
  }
  const form = await request.formData().catch(() => null);
  if (!form) return apiError(400, "bad_request", "Send a multipart form with photo, lat and lng");

  const fields = fieldsSchema.safeParse({
    lat: form.get("lat"), lng: form.get("lng"), source: form.get("source"), takenAt: form.get("takenAt"),
  });
  if (!fields.success) {
    const issue = fields.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return apiError(400, "bad_request", `${where}${issue?.message ?? "invalid form"}`);
  }
  const { lat, lng, source, takenAt } = fields.data;
  const position: LngLat = [lng, lat];

  const file = form.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return apiError(400, "bad_request", "photo is required (a JPEG or PNG file)");
  if (file.size > MAX_PHOTO_BYTES) return apiError(413, "too_large", "The photo is larger than 10 MB");

  let bbox: Manifest["bbox"];
  try {
    bbox = await (deps.studyBox ?? (async () => (await loadManifestFromDisk()).bbox))();
  } catch (err) {
    console.error(`[reports] study box unavailable: ${describeError(err)}`);
    return apiError(500, "data_unavailable", "Map data is unavailable, try again shortly");
  }
  if (!insideBox(bbox, position)) return apiError(400, "outside_area", "This position is outside the area Fludd covers");

  let photo;
  try {
    photo = stripMetadata(new Uint8Array(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof PhotoError) return apiError(err.status, err.code, err.message);
    throw err;
  }

  const id = (deps.newId ?? (() => crypto.randomUUID()))();
  const photoPath = `${id}.${photo.ext}`;

  const reading = deps.photoReader
    ? deps.photoReader.read({ base64: toBase64(photo.bytes), mimeType: photo.mimeType }).catch((err: unknown) => {
        console.warn(`[reports] ${id}: photo reading failed (${describeError(err)})`);
        return null;
      })
    : Promise.resolve(null);
  const depth = (deps.modelDepth ?? miltonPeakDepthM)(position).catch((err: unknown) => {
    console.warn(`[reports] ${id}: model depth unavailable (${describeError(err)})`);
    return null;
  });

  let publicPosition: LngLat;
  try {
    publicPosition = await (deps.snap ?? snapToRoad)(position);
  } catch (err) {
    console.error(`[reports] ${id}: road snapping failed: ${describeError(err)}`);
    return apiError(500, "data_unavailable", "Road data is unavailable, try again shortly");
  }

  try {
    await deps.store.uploadPhoto(photoPath, photo.bytes, photo.mimeType);
  } catch (err) {
    console.error(`[reports] ${id}: ${err instanceof Error ? err.message : "photo upload failed"}`);
    return apiError(502, "storage_failed", "The photo could not be stored, try again");
  }

  const [aiReading, modelDepthM] = await Promise.all([reading, depth]);
  if (!aiReading) console.warn(`[reports] ${id}: reading unavailable, sent for manual review`);

  try {
    await deps.store.insertReport({
      id,
      taken_at: takenAt ?? null,
      exact_lng: lng,
      exact_lat: lat,
      public_lng: publicPosition[0],
      public_lat: publicPosition[1],
      position_source: source,
      photo_path: photoPath,
      ai_reading: aiReading,
      ai_status: aiReading ? "read" : "unavailable",
      model_depth_m: modelDepthM,
    });
  } catch (err) {
    console.error(`[reports] ${id}: ${err instanceof Error ? err.message : "report insert failed"}`);
    await deps.store.removePhoto(photoPath).catch(() => undefined);
    return apiError(502, "storage_failed", "The report could not be saved, try again");
  }

  return Response.json({ id, status: "waiting", aiReading } satisfies IntakeAnswer, { status: 201 });
}
