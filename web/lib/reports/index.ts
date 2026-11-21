// Server only. What the report routes call; the routes themselves stay thin.
import { apiError } from "@/lib/api";
import { createAnonClient, createServiceClient, SupabaseNotConfigured } from "@/lib/supabase/server";
import { supabaseStore, type ReportStore } from "./store";

export { handleApprovedFeed } from "./feed";
export { handleReportUpload } from "./intake";
export { handleModerate } from "./moderate";

let shared: ReportStore | null = null;

/**
 * One store per server instance. `needs` names the Supabase clients the caller uses; a missing setting
 * throws SupabaseNotConfigured here, before any work, so guarded() can answer 503.
 */
export function defaultStore(needs: "anon" | "service"): ReportStore {
  if (needs === "anon") createAnonClient();
  else createServiceClient();
  shared ??= supabaseStore({ service: createServiceClient, anon: createAnonClient });
  return shared;
}

/** Runs a handler, turning missing Supabase settings into 503 and anything unexpected into 500. */
export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof SupabaseNotConfigured) {
      console.error(`[reports] ${err.message}`);
      return apiError(503, "not_configured", "Reports are not set up on this server yet");
    }
    console.error(`[reports] unexpected: ${err instanceof Error ? `${err.name}: ${err.message}` : "error"}`);
    return apiError(500, "server_error", "Something went wrong, try again");
  }
}
