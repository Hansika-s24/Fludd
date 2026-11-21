// Liveness plus the data manifest version the server sees.
import { loadManifestFromDisk } from "@/lib/reports/data";

export async function GET() {
  try {
    const m = await loadManifestFromDisk();
    return Response.json({ status: "ok", dataVersion: m.version });
  } catch {
    return Response.json({ status: "degraded", dataVersion: "unavailable" }, { status: 503 });
  }
}
