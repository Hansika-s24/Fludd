import { describe, expect, it } from "vitest";
import { checklist } from "@/components/property-check/checklist";
import type { Grade } from "@/lib/types";

const dry: Grade["depthByStorm"] = { "10yr": "none", "25yr": "none", "100yr": "none", "500yr": "none", milton: "none" };
const base = { letter: "A" as const, depthByStorm: dry, officialMapSays: "Zone X, minimal flood hazard", reasons: [] as Grade["reasons"] };
const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe("checklist", () => {
  it("is calm for a dry address in a minimal zone, and still asks for the disclosure", () => {
    const items = checklist("buying", base);
    expect(titles(items)).toEqual(["Water at the building", "Official flood zone", "What Milton did", "Before you sign"]);
    expect(items.slice(0, 3).every((i) => i.level === "good")).toBe(true);
    expect(items[3].finding).toMatch(/flood disclosure/);
  });

  it("names the first storm that floods the building in plain words, never a return period", () => {
    const items = checklist("renting", { ...base, letter: "C", depthByStorm: { ...dry, "100yr": "6_12in", "500yr": "1_2ft" } });
    expect(items[0]).toMatchObject({ level: "watch", finding: "The model puts 6 to 12 in of water at the building in hurricane-level rain." });
    expect(items[0].todo).toMatch(/upper floor/);
    expect(JSON.stringify(items)).not.toMatch(/-year storm/);
  });

  it("tells a builder how high to set the floor from the band, and treats an early flood as urgent", () => {
    const items = checklist("building", { ...base, letter: "F", depthByStorm: { ...dry, "10yr": "1_2ft", "25yr": "1_2ft", "100yr": "over_2ft", "500yr": "over_2ft" } });
    expect(items[0]).toMatchObject({ level: "act" });
    expect(items[0].todo).toMatch(/above 2 ft/);
    expect(items.at(-1)).toMatchObject({ title: "Drainage on the lot", level: "watch" });
  });

  it("says a high-risk zone needs flood insurance for a mortgage", () => {
    const items = checklist("buying", { ...base, letter: "C", officialMapSays: "Zone AE, high-risk flood area (1% annual chance)" });
    expect(items[1]).toMatchObject({ level: "act" });
    expect(items[1].todo).toMatch(/requires flood insurance/);
  });

  it("adds Milton damage and pump dependence only when the grade found them", () => {
    const reasons: Grade["reasons"] = [
      { kind: "cap", text: "No better than D: Milton flood damage was recorded within 100 m" },
      { kind: "notch", text: "One letter down: this spot depends on the pump station" },
    ];
    const items = checklist("buying", { ...base, letter: "D", reasons });
    expect(titles(items)).toContain("Pump station");
    expect(items.find((i) => i.title === "What Milton did")).toMatchObject({ level: "act" });
    expect(titles(checklist("buying", base))).not.toContain("Pump station");
  });
});
