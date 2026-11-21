// One shared browser Supabase client, created on first use. Anon key only: never the service role.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

let client: SupabaseClient | null = null;

/** True when both the project URL and the anon key are set. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
}

/**
 * The shared browser client, or null when Supabase is not configured.
 * Never throws at import: callers check for null and fall back to "not configured" behaviour.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client === null) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
