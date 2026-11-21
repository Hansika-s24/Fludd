// Server only. Gemini through the Interactions API of @google/genai, with structured JSON output.
// Tries the primary model, then the fallback model; throws if both fail.
import { GoogleGenAI } from "@google/genai";
import { sentencesSchema, type GenerateRequest, type TextProvider } from "./provider";

export interface InteractionParams {
  model: string;
  input: string;
  system_instruction: string;
  store: boolean;
  generation_config: { thinking_level: "low" };
  response_format: { type: "text"; mime_type: "application/json"; schema: Record<string, unknown> };
}

/** The one SDK call this provider makes; injectable so tests never touch the network. */
export type CreateInteraction = (params: InteractionParams) => Promise<{ output_text?: string | undefined }>;

/** Per model. Two short sentences need little thinking; a slow answer falls through to the next model. */
const TIMEOUT_MS = 25_000;

export function sdkCreate(apiKey: string): CreateInteraction {
  const ai = new GoogleGenAI({ apiKey });
  return (params) => ai.interactions.create(params, { timeout: TIMEOUT_MS, maxRetries: 0 });
}

/** Status and message only, never request details, so a key can never reach the logs. */
export function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const status = "status" in err ? String(err.status) : "?";
    const name = err instanceof Error ? err.name : "Error";
    return `${name} status=${status}`;
  }
  return "unknown error";
}

export class GeminiProvider implements TextProvider {
  readonly name = "gemini";
  private readonly create: CreateInteraction;
  private readonly models: string[];

  constructor(opts: { create: CreateInteraction; model: string; fallbackModel: string }) {
    this.create = opts.create;
    this.models = [...new Set([opts.model, opts.fallbackModel].filter(Boolean))];
  }

  async generate(req: GenerateRequest): Promise<string> {
    let lastError: unknown = new Error("no model configured");
    for (const model of this.models) {
      try {
        const result = await this.create({
          model,
          input: req.input,
          system_instruction: req.system,
          store: false,
          generation_config: { thinking_level: "low" },
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: sentencesSchema(req.minItems, req.maxItems),
          },
        });
        if (result.output_text) return result.output_text;
        lastError = new Error(`empty answer from ${model}`);
      } catch (err) {
        lastError = err;
        console.warn(`[gemini] ${model} failed: ${describeError(err)}`);
      }
    }
    throw lastError;
  }
}
