// Server only. The text-provider interface the Gemini routes call, so a second provider
// can be added without touching callers. A null provider means "AI switched off".

export interface GenerateRequest {
  /** Rules for the model. */
  system: string;
  /** The facts, as JSON text. */
  input: string;
  /** The answer must be JSON {"sentences": string[]} with this many items. */
  minItems: number;
  maxItems: number;
}

export interface TextProvider {
  readonly name: string;
  /** Raw model text, expected to be JSON {"sentences": [...]}. Throws on any failure. */
  generate(request: GenerateRequest): Promise<string>;
}

/** JSON schema for the answer, shared by every provider. */
export function sentencesSchema(minItems: number, maxItems: number) {
  return {
    type: "object",
    properties: {
      sentences: { type: "array", items: { type: "string" }, minItems, maxItems },
    },
    required: ["sentences"],
  };
}
