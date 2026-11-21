import type { Scenario } from "@/lib/types";

/**
 * Storms in words people use. "100-year storm" means nothing to most people (and sounds like it can't happen
 * twice), so the interface names what the storm feels like, with one honest line on how often.
 */
export const STORM_WORDS: Record<Scenario, { short: string; name: string; often: string }> = {
  "10yr": { short: "Heavy rain", name: "Heavy summer rain", often: "Likely in any given decade" },
  "25yr": { short: "Big storm", name: "A big storm", often: "A few times in a lifetime" },
  "100yr": { short: "Hurricane", name: "Hurricane-level rain", often: "About a 1 in 4 chance over a 30-year mortgage" },
  "500yr": { short: "Worst case", name: "Worst-case rain", often: "About a 1 in 17 chance over 30 years" },
  milton: { short: "Milton", name: "Hurricane Milton, Oct 2024", often: "What actually fell here" },
};
