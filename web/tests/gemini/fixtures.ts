// Sample inputs and fake providers shared by the Gemini tests. No network.
import type { GenerateRequest, TextProvider } from "@/lib/gemini/provider";

export const remediesInput = {
  letter: "D",
  depthByStorm: { "10yr": "none", "25yr": "under_6in", "100yr": "6_12in", "500yr": "1_2ft", milton: "6_12in" },
  femaZone: "Zone X, minimal flood hazard",
  miltonPointNearby: true,
  pumpDependent: true,
  depthAtBuilding100yrM: 0.24,
} as const;

export const guidanceInput = {
  letter: "D",
  scenario: "100yr",
  pump: "on",
  hour: 6,
  timeLabel: "2 PM",
  depthM: 0.18,
  depthBand: "6_12in",
  moveByHour: 4,
  moveByLabel: "noon",
  cutoffHour: 7,
  cutoffLabel: "3 PM",
  parkingName: "Fowler Avenue garage",
} as const;

/** A provider that answers with fixed text, and counts calls. */
export function fakeProvider(answer: string): TextProvider & { calls: number } {
  const p = {
    name: "fake",
    calls: 0,
    async generate(_req: GenerateRequest): Promise<string> {
      p.calls += 1;
      return answer;
    },
  };
  return p;
}

/** A provider that always throws, like a 429 from the API. */
export function throwingProvider(status: number): TextProvider {
  return {
    name: "fake",
    async generate(): Promise<string> {
      throw Object.assign(new Error(`HTTP ${status}`), { status });
    },
  };
}

export const json = (sentences: string[]) => JSON.stringify({ sentences });

export const post = (body: unknown) =>
  new Request("http://localhost/api/gemini/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
