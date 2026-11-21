// Gemini answers are cached per provider, so a repeated address answers instantly; fallbacks are never cached.
import { describe, expect, it } from "vitest";
import { handleGuidance, handleRemedies } from "@/lib/gemini/handlers";
import type { TextProvider } from "@/lib/gemini/provider";
import { fakeProvider, guidanceInput, json, post, remediesInput } from "./fixtures";

describe("gemini answer cache", () => {
  it("asks Gemini once for the same remedies input", async () => {
    const provider = fakeProvider(json(["Raise the lowest floor.", "Price flood insurance."]));
    const first = await handleRemedies(post(remediesInput), provider);
    const second = await handleRemedies(post(remediesInput), provider);
    expect(provider.calls).toBe(1);
    expect(await second.json()).toEqual(await first.json());
    expect(second.headers.get("x-fludd-text-source")).toBe("gemini");
  });

  it("asks again when the input differs", async () => {
    const provider = fakeProvider(json(["Raise the lowest floor.", "Price flood insurance."]));
    await handleRemedies(post(remediesInput), provider);
    await handleRemedies(post({ ...remediesInput, letter: "F" }), provider);
    expect(provider.calls).toBe(2);
  });

  it("caches guidance separately from remedies", async () => {
    const provider = fakeProvider(json(["Water reaches the door.", "Never drive through flood water."]));
    await handleGuidance(post(guidanceInput), provider);
    await handleGuidance(post(guidanceInput), provider);
    expect(provider.calls).toBe(1);
  });

  it("does not cache a failure", async () => {
    const provider: TextProvider & { calls: number } = {
      name: "fake",
      calls: 0,
      async generate(): Promise<string> {
        provider.calls += 1;
        throw Object.assign(new Error("HTTP 503"), { status: 503 });
      },
    };
    const a = await handleRemedies(post(remediesInput), provider);
    const b = await handleRemedies(post(remediesInput), provider);
    expect(a.headers.get("x-fludd-text-source")).toBe("fallback");
    expect(b.headers.get("x-fludd-text-source")).toBe("fallback");
    expect(provider.calls).toBe(2);
  });
});
