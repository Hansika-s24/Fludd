// Resident flood reports (Hansika). Logic in lib/reports; this file only wires it up.
// GET  /api/reports?status=approved -> { reports: PublicReport[] } (street-level positions only)
// POST /api/reports, multipart: photo, lat, lng, source ("gps" | "pin", default "pin"), takenAt (ISO, optional)
//      -> 201 { id, status: "waiting", aiReading | null }. Also what the Apple Shortcut posts.
import { getPhotoReader, type PhotoReader } from "@/lib/gemini/photo";
import { defaultStore, guarded, handleApprovedFeed, handleReportUpload } from "@/lib/reports";

function photoReader(): PhotoReader | null {
  try {
    return getPhotoReader();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  return guarded(() => handleApprovedFeed(request, defaultStore("anon")));
}

export async function POST(request: Request) {
  return guarded(() => handleReportUpload(request, { store: defaultStore("service"), photoReader: photoReader() }));
}
