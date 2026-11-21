// Gemini photo reading with a fake SDK call: request shape, model fallback, schema checks.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GeminiPhotoReader, getPhotoReader, parseAiReading, type CreatePhotoInteraction,
} from "@/lib/gemini/photo";

const photo = { base64: "AAEC", mimeType: "image/jpeg" as const };
const good = { waterPresent: true, depthRangeM: [0.1, 0.2], reference: "curb", confidence: 0.6 };

describe("parseAiReading", () => {
  it("accepts exactly the schema", () => {
    expect(parseAiReading(JSON.stringify(good))).toEqual(good);
  });
  it.each([
    ["not JSON", "water: yes"],
    ["extra key", JSON.stringify({ ...good, note: "x" })],
    ["missing key", JSON.stringify({ waterPresent: true, depthRangeM: [0, 1], reference: "curb" })],
    ["low above high", JSON.stringify({ ...good, depthRangeM: [0.3, 0.1] })],
    ["depth over 3 m", JSON.stringify({ ...good, depthRangeM: [0.1, 3.5] })],
    ["negative depth", JSON.stringify({ ...good, depthRangeM: [-0.1, 0.2] })],
    ["three depths", JSON.stringify({ ...good, depthRangeM: [0.1, 0.2, 0.3] })],
    ["confidence over 1", JSON.stringify({ ...good, confidence: 1.2 })],
    ["empty reference", JSON.stringify({ ...good, reference: " " })],
    ["string boolean", JSON.stringify({ ...good, waterPresent: "true" })],
  ])("refuses %s", (_label, text) => {
    expect(parseAiReading(text)).toBeNull();
  });
});

describe("GeminiPhotoReader", () => {
  it("sends the image inline as base64 with its mime type, unstored, with the JSON schema", async () => {
    const create = vi.fn<CreatePhotoInteraction>(async () => ({ output_text: JSON.stringify(good) }));
    const reader = new GeminiPhotoReader({ create, model: "m1", fallbackModel: "m2" });
    expect(await reader.read(photo)).toEqual(good);
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0];
    expect(params.model).toBe("m1");
    expect(params.store).toBe(false);
    expect(params.input[1]).toEqual({ type: "image", data: "AAEC", mime_type: "image/jpeg" });
    expect(params.input[0].type).toBe("text");
    expect(params.response_format.mime_type).toBe("application/json");
    expect(params.response_format.schema).toMatchObject({
      required: ["waterPresent", "depthRangeM", "reference", "confidence"],
    });
  });

  it("falls back to the second model on an error such as 429", async () => {
    const create = vi.fn<CreatePhotoInteraction>(async ({ model }) => {
      if (model === "m1") throw Object.assign(new Error("rate limited"), { status: 429 });
      return { output_text: JSON.stringify(good) };
    });
    const reader = new GeminiPhotoReader({ create, model: "m1", fallbackModel: "m2" });
    expect(await reader.read(photo)).toEqual(good);
    expect(create.mock.calls.map((c) => c[0].model)).toEqual(["m1", "m2"]);
  });

  it("falls back on an off-schema answer and throws when every model fails", async () => {
    const create = vi.fn<CreatePhotoInteraction>(async () => ({ output_text: '{"waterPresent":true}' }));
    const reader = new GeminiPhotoReader({ create, model: "m1", fallbackModel: "m2" });
    await expect(reader.read(photo)).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("asks one model once when both names are the same", async () => {
    const create = vi.fn<CreatePhotoInteraction>(async () => {
      throw new Error("timeout");
    });
    const reader = new GeminiPhotoReader({ create, model: "m1", fallbackModel: "m1" });
    await expect(reader.read(photo)).rejects.toThrow("timeout");
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("getPhotoReader", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("is off without a key", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(getPhotoReader()).toBeNull();
  });
  it("is Gemini with a key", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(getPhotoReader()?.name).toBe("gemini");
  });
});
