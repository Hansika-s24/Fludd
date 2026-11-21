// STUB (Harshith's 11:00 scaffold). Real-estate extra; Hansika replaces it. Name and types as in docs/contracts.md.
import type { BetterOption, LngLat } from "@/lib/types";

/** STUB: two toy homes, best first. */
export async function findBetterOptions(_position: LngLat): Promise<BetterOption[]> {
  return [
    { address: "1 Toy Dry Ln, Tampa", position: [-82.4185, 28.0628], assessedValue: 245000, beds: 3, baths: 2, livingAreaSqft: 1450, propertyType: "SINGLE FAMILY", grade: "A", distanceM: 620 },
    { address: "2 Toy High St, Tampa", position: [-82.4095, 28.0632], assessedValue: 238000, beds: 3, baths: 1.5, livingAreaSqft: 1320, propertyType: "SINGLE FAMILY", grade: "B", distanceM: 910 },
  ];
}
