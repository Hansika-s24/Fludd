// The only place env is read on the web side. Documented in .env.example.

/** "toy" serves public/data/toy (the fixture); "real" serves public/data (pipeline output). */
export const DATA_SET: "toy" | "real" = process.env.NEXT_PUBLIC_DATA_SET === "real" ? "real" : "toy";
export const DATA_BASE = DATA_SET === "real" ? "/data" : "/data/toy";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Server only. Never import these into a client component. */
export const serverConfig = () => ({
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "gemini",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-4-hydrogen",
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.8-flash",
  nwsUserAgent: process.env.NWS_USER_AGENT ?? "fludd.app (hackathon demo)",
});
