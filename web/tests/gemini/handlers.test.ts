import { describe, expect, it, vi } from "vitest";
import { GUIDANCE_FALLBACK, REMEDIES_FALLBACK, handleGuidance, handleRemedies } from "@/lib/gemini/handlers";
import type { GenerateRequest } from "@/lib/gemini/provider";
import { fakeProvider, guidanceInput, json, post, remediesInput, throwingProvider } from "./fixtures";

type Remedies = { sentences: string[] };
type Guidance = { text: string };

describe("POST /api/gemini/remedies", () => {
  it("returns the model's sentences when they pass every guard", async () => {
    const sentences = [
      "Raising the floor above the modelled 0.24 m water level at the building is the most effective fix.",
      "Flood vents let water pass through a crawl space instead of pushing on the walls.",
      "Flood insurance is worth pricing even though the official map says Zone X.",
    ];
    const res = await handleRemedies(post(remediesInput), fakeProvider(json(sentences)));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fludd-text-source")).toBe("gemini");
    expect(((await res.json()) as Remedies).sentences).toEqual(sentences);
  });

  it("sends the input numbers and the rules to the provider", async () => {
    const seen: GenerateRequest[] = [];
    const provider = {
      name: "fake",
      async generate(req: GenerateRequest) {
        seen.push(req);
        return json(["Flood vents help.", "Flood insurance helps."]);
      },
    };
    await handleRemedies(post(remediesInput), provider);
    expect([seen[0].minItems, seen[0].maxItems]).toEqual([2, 4]);
    expect(seen[0].input).toContain("0.24");
    expect(seen[0].system).toMatch(/do not (add|introduce|use) any (other )?number/i);
  });

  it("falls back when the model invents a number", async () => {
    const res = await handleRemedies(
      post(remediesInput),
      fakeProvider(json(["Raise the floor by 3 feet.", "Buy flood insurance."])),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fludd-text-source")).toBe("fallback");
    expect(((await res.json()) as Remedies).sentences).toEqual(REMEDIES_FALLBACK);
  });

  it("falls back on unsafe driving advice", async () => {
    const res = await handleRemedies(
      post(remediesInput),
      fakeProvider(json(["The road out is safe to drive.", "Buy flood insurance."])),
    );
    expect(((await res.json()) as Remedies).sentences).toEqual(REMEDIES_FALLBACK);
  });

  it("falls back when the answer is not the expected JSON or has the wrong count", async () => {
    for (const answer of ["not json", json(["Only one sentence."]), json(["a", "b", "c", "d", "e"]), "{}"]) {
      const res = await handleRemedies(post(remediesInput), fakeProvider(answer));
      expect(((await res.json()) as Remedies).sentences).toEqual(REMEDIES_FALLBACK);
    }
  });

  it("falls back on a 429 without crashing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await handleRemedies(post(remediesInput), throwingProvider(429));
    expect(res.status).toBe(200);
    expect(((await res.json()) as Remedies).sentences).toEqual(REMEDIES_FALLBACK);
    warn.mockRestore();
  });

  it("falls back with the provider off and never calls anything", async () => {
    const res = await handleRemedies(post(remediesInput), null);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fludd-text-source")).toBe("off");
    expect(((await res.json()) as Remedies).sentences).toEqual(REMEDIES_FALLBACK);
  });

  it("has a fallback of 2 to 4 sentences", () => {
    expect(REMEDIES_FALLBACK.length).toBeGreaterThanOrEqual(2);
    expect(REMEDIES_FALLBACK.length).toBeLessThanOrEqual(4);
  });

  it.each([
    ["no body", ""],
    ["not JSON", "{oops"],
    ["missing fields", { letter: "D" }],
    ["bad letter", { ...remediesInput, letter: "E" }],
    ["negative depth", { ...remediesInput, depthAtBuilding100yrM: -1 }],
    ["unknown field", { ...remediesInput, extra: 1 }],
  ])("returns 400 in the shared error shape for %s", async (_, body) => {
    const provider = fakeProvider(json(["a.", "b."]));
    const res = await handleRemedies(post(body), provider);
    expect(res.status).toBe(400);
    const err = (await res.json()) as { error: { code: string; message: string } };
    expect(err.error.code).toBe("bad_request");
    expect(typeof err.error.message).toBe("string");
    expect(provider.calls).toBe(0);
  });
});

describe("POST /api/gemini/guidance", () => {
  it("returns two or three sentences as one text when they pass every guard", async () => {
    const sentences = [
      "In a 100-year storm, water near your door reaches about 0.18 m by 2 PM.",
      "Move your car to the Fowler Avenue garage by noon.",
      "Never drive through flood water.",
    ];
    const res = await handleGuidance(post(guidanceInput), fakeProvider(json(sentences)));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fludd-text-source")).toBe("gemini");
    expect(((await res.json()) as Guidance).text).toBe(sentences.join(" "));
  });

  it("asks the provider for 2 to 3 sentences", async () => {
    const seen: GenerateRequest[] = [];
    const provider = {
      name: "fake",
      async generate(req: GenerateRequest) {
        seen.push(req);
        return json(["Move your car by noon.", "Never drive through flood water."]);
      },
    };
    const res = await handleGuidance(post(guidanceInput), provider);
    expect([seen[0].minItems, seen[0].maxItems]).toEqual([2, 3]);
    expect(res.headers.get("x-fludd-text-source")).toBe("gemini");
  });

  it("falls back when the model invents a number", async () => {
    const res = await handleGuidance(
      post(guidanceInput),
      fakeProvider(json(["Water reaches 7 inches by 2 PM.", "Move your car by noon."])),
    );
    expect(((await res.json()) as Guidance).text).toBe(GUIDANCE_FALLBACK);
  });

  it("falls back on unsafe driving advice", async () => {
    const res = await handleGuidance(
      post(guidanceInput),
      fakeProvider(json(["You can still drive through the water before noon.", "Move your car."])),
    );
    expect(((await res.json()) as Guidance).text).toBe(GUIDANCE_FALLBACK);
  });

  it("falls back on a 429, another error, and with the provider off", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const provider of [throwingProvider(429), throwingProvider(500), null]) {
      const res = await handleGuidance(post(guidanceInput), provider);
      expect(res.status).toBe(200);
      expect(((await res.json()) as Guidance).text).toBe(GUIDANCE_FALLBACK);
    }
    warn.mockRestore();
  });

  it("accepts the minimum input: grade, scenario, pump, hour and depth", async () => {
    const res = await handleGuidance(post({ letter: "A", scenario: "10yr", pump: "off", hour: 0, depthM: 0 }), null);
    expect(res.status).toBe(200);
  });

  it.each([
    ["no body", ""],
    ["bad scenario", { ...guidanceInput, scenario: "1000yr" }],
    ["fractional hour", { ...guidanceInput, hour: 1.5 }],
    ["long label", { ...guidanceInput, parkingName: "x".repeat(500) }],
  ])("returns 400 for %s", async (_, body) => {
    const res = await handleGuidance(post(body), null);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("bad_request");
  });

  it("has a fixed fallback with no numbers and the never-drive rule", () => {
    expect(GUIDANCE_FALLBACK).not.toMatch(/\d/);
    expect(GUIDANCE_FALLBACK).toMatch(/never drive/i);
  });
});
