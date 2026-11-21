import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STEP_ILLUSTRATIONS, illustrationForStep, type IllustratedStep } from "@/components/illustrations";

// The step keys live in a private union in the onboarding screen, so read them from its source.
const source = readFileSync(
  fileURLToPath(new URL("../../components/onboarding/onboarding-screen.tsx", import.meta.url)),
  "utf8",
);
const union = /type ScreenId\s*=([^;]+);/.exec(source)?.[1] ?? "";
const stepKeys = [...union.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

describe("onboarding step illustrations", () => {
  it("finds the step keys in onboarding-screen.tsx", () => {
    expect(stepKeys.length).toBeGreaterThanOrEqual(12);
    expect(stepKeys).toContain("welcome");
    expect(stepKeys).toContain("done");
  });

  it("has art for every onboarding step", () => {
    const missing = stepKeys.filter((key) => !(key in STEP_ILLUSTRATIONS));
    expect(missing).toEqual([]);
    for (const key of stepKeys) expect(typeof illustrationForStep(key as IllustratedStep)).toBe("function");
  });

  it("maps no step that the onboarding flow no longer has", () => {
    const stale = Object.keys(STEP_ILLUSTRATIONS).filter((key) => !stepKeys.includes(key));
    expect(stale).toEqual([]);
  });
});
