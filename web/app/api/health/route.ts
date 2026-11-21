import { apiError } from "@/lib/api";
import { loadManifestFromDisk } from "@/lib/reports/data";

export async function GET() {
  try {
    const { version } = await loadManifestFromDisk();
    return Response.json({ status: "ok", dataVersion: version });
  } catch {
    return apiError(503, "manifest_unavailable", "The data manifest is unavailable.");
  }
}
