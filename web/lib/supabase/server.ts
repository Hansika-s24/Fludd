// Server only. Never import from a client component: the service-role client bypasses row-level security.
// Keys come from lib/config.ts and are never logged.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, serverConfig } from "@/lib/config";

export class SupabaseNotConfigured extends Error {
  constructor(missing: string) {
    super(`Supabase is not configured on the server (${missing} missing)`);
    this.name = "SupabaseNotConfigured";
  }
}

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Service-role client: uploads photos, writes reports and the moderation log, checks admins. */
export function createServiceClient(): SupabaseClient {
  const key = serverConfig().supabaseServiceRoleKey;
  if (!SUPABASE_URL) throw new SupabaseNotConfigured("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new SupabaseNotConfigured("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(SUPABASE_URL, key, NO_SESSION);
}

/** Anon client: reads only what row-level security lets anyone read (public_reports). */
export function createAnonClient(): SupabaseClient {
  if (!SUPABASE_URL) throw new SupabaseNotConfigured("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) throw new SupabaseNotConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_SESSION);
}
