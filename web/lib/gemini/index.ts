// Server only. Picks the text provider from env (read through lib/config.ts).
// AI_PROVIDER=gemini (default) with GEMINI_API_KEY set -> Gemini; anything else -> off (null).
import { serverConfig } from "@/lib/config";
import { GeminiProvider, sdkCreate } from "./gemini";
import type { TextProvider } from "./provider";

export type { GenerateRequest, TextProvider } from "./provider";

let shared: { key: string; provider: TextProvider } | null = null;

/** One provider per server instance, so its answer cache is reused across requests. */
export function getProvider(): TextProvider | null {
  const cfg = serverConfig();
  if (cfg.aiProvider !== "gemini" || !cfg.geminiApiKey) return null;
  const key = `${cfg.geminiModel}|${cfg.geminiFallbackModel}|${cfg.geminiApiKey}`;
  if (!shared || shared.key !== key) {
    shared = {
      key,
      provider: new GeminiProvider({
        create: sdkCreate(cfg.geminiApiKey),
        model: cfg.geminiModel,
        fallbackModel: cfg.geminiFallbackModel,
      }),
    };
  }
  return shared.provider;
}
