// Body: { text: string (1..300), position: [lng, lat] }.
// Returns { intent, places: { name, position, distanceM }[], addressMatch?: { label, position } }.
// Gemini only reads the request (keyword fallback when off or failing); places are real OSM places,
// addresses come from the county locator. Header x-fludd-text-source: gemini | fallback | off.
// Bad input -> 400, place search down -> 502, both in the shared error shape.
import { serverConfig } from "@/lib/config";
import { intentAsker } from "@/lib/pelican/asker";
import { handlePelican } from "@/lib/pelican/handler";
import { loadManifestFromDisk } from "@/lib/reports/data";

export async function POST(request: Request) {
  return handlePelican(request, {
    ask: intentAsker(),
    manifest: loadManifestFromDisk,
    userAgent: serverConfig().nwsUserAgent,
  });
}
