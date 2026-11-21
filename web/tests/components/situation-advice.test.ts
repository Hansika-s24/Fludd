import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, type Profile } from "@/components/onboarding/profile";
import { adviceFor } from "@/components/stages/situation-advice";

const make = (p: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...p, done: true });
const text = (items: unknown) => JSON.stringify(items).toLowerCase();

describe("adviceFor", () => {
  it("does not tell a renter on an upper floor to raise the floor", () => {
    const renter = make({
      housing: { tenure: "rent", type: "apartment", floor: 2 },
      insurance: { ...EMPTY_PROFILE.insurance, flood: "none", contents: false },
    });
    const items = adviceFor(renter, "D");
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(4);
    expect(text(items)).not.toMatch(/raise the (lowest )?floor/);
    expect(text(items)).toMatch(/contents|renters/);
  });

  it("tells an uninsured owner of a low-graded house to price NFIP", () => {
    const owner = make({
      housing: { tenure: "own", type: "house", floor: null },
      insurance: { ...EMPTY_PROFILE.insurance, flood: "none" },
    });
    expect(text(adviceFor(owner, "C"))).toMatch(/nfip/);
  });

  it("never calls a place safe", () => {
    for (const letter of ["A", "B", "C", "D", "F"] as const) {
      expect(text(adviceFor(make({}), letter))).not.toMatch(/\bsafe\b/);
    }
  });
});
