// Test helper: serves /data/... URLs from web/public/data so the browser loaders run unchanged in node.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicDir = join(__dirname, "../../public");

/** A fetch that reads /data/... paths from disk; anything else is handed to `other` (or 404s). */
export function diskFetch(other?: (url: string) => Response | Promise<Response>) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("/data/")) {
      try {
        return new Response(readFileSync(join(publicDir, url)));
      } catch {
        return new Response("not found", { status: 404 });
      }
    }
    if (other) return other(url);
    return new Response("not found", { status: 404 });
  };
}
