// Server only. The Gemini call behind Ask Pelican: same SDK call, models and on/off switch as lib/gemini,
// but with the intent schema as the forced structured output. Primary model, then fallback; throws if both fail.
import { serverConfig } from "@/lib/config";
import { getProvider } from "@/lib/gemini";
import { describeError, sdkCreate, type CreateInteraction } from "@/lib/gemini/gemini";
import type { IntentAsker } from "./intent";

export function geminiAsker(create: CreateInteraction, models: string[]): IntentAsker {
  return async ({ system, input, schema }) => {
    let lastError: unknown = new Error("no model configured");
    for (const model of models) {
      try {
        const result = await create({
          model,
          input,
          system_instruction: system,
          store: false,
          generation_config: { thinking_level: "low" },
          response_format: { type: "text", mime_type: "application/json", schema },
        });
        if (result.output_text) return result.output_text;
        lastError = new Error(`empty answer from ${model}`);
      } catch (err) {
        lastError = err;
        console.warn(`[pelican] ${model} failed: ${describeError(err)}`);
      }
    }
    throw lastError;
  };
}

/** null when AI is switched off (same rule as getProvider). */
export function intentAsker(): IntentAsker | null {
  try {
    if (!getProvider()) return null;
    const cfg = serverConfig();
    const models = [...new Set([cfg.geminiModel, cfg.geminiFallbackModel].filter(Boolean))];
    return geminiAsker(sdkCreate(cfg.geminiApiKey), models);
  } catch {
    return null;
  }
}
