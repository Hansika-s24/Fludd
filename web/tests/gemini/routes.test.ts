// The real route files, with the provider switched off through env (no network).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as guidance } from "@/app/api/gemini/guidance/route";
import { POST as remedies } from "@/app/api/gemini/remedies/route";
import { GUIDANCE_FALLBACK, REMEDIES_FALLBACK } from "@/lib/gemini/handlers";
import { guidanceInput, post, remediesInput } from "./fixtures";

describe("gemini routes with AI_PROVIDER=off", () => {
  beforeEach(() => vi.stubEnv("AI_PROVIDER", "off"));
  afterEach(() => vi.unstubAllEnvs());

  it("remedies answers { sentences } from the fallback", async () => {
    const res = await remedies(post(remediesInput));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sentences: REMEDIES_FALLBACK });
  });

  it("guidance answers { text } from the fallback", async () => {
    const res = await guidance(post(guidanceInput));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: GUIDANCE_FALLBACK });
  });

  it("both reject bad input with the shared error shape", async () => {
    for (const handler of [remedies, guidance]) {
      const res = await handler(post({}));
      expect(res.status).toBe(400);
      expect(Object.keys(((await res.json()) as { error: object }).error).sort()).toEqual(["code", "message"]);
    }
  });
});
