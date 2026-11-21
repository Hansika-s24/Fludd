import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", { spy: true });

describe("GET /api/health", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ["toy", "public/data/toy/manifest.json"],
    ["real", "public/data/manifest.json"],
  ])("returns the %s manifest version", async (dataSet, path) => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SET", dataSet);
    const manifest = JSON.parse(readFileSync(path, "utf8")) as { version: string };
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", dataVersion: manifest.version });
  });

  it.each(["missing", "malformed", "invalid"])("returns a contract error when the manifest is %s", async (failure) => {
    const file = vi.mocked(readFile);
    if (failure === "missing") {
      file.mockRejectedValueOnce(new Error("ENOENT: missing manifest"));
    } else {
      file.mockResolvedValueOnce(failure === "malformed" ? "{" : "{}");
    }
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "manifest_unavailable", message: "The data manifest is unavailable." },
    });
  });
});
