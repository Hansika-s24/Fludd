import { describe, expect, it } from "vitest";
import { checkIntent, fallbackIntent, parseIntent } from "@/lib/pelican/intent";

describe("fallbackIntent", () => {
  it.each([
    ["I want to go get some groceries", "grocery"],
    ["nearest supermarket", "grocery"],
    ["need food", "grocery"],
    ["get my meds", "pharmacy"],
    ["is CVS open", "pharmacy"],
    ["walgreens please", "pharmacy"],
    ["get me to the hospital", "hospital"],
    ["take me to the ER", "hospital"],
    ["this is an emergency", "hospital"],
    ["I need gas", "gas"],
    ["where is a shelter", "shelter"],
  ] as const)("%s -> %s", (text, category) => {
    expect(fallbackIntent(text)).toEqual({ kind: "category", category, vehicle: "car" });
  });

  it("reads walking as foot", () => {
    expect(fallbackIntent("I'll walk to the pharmacy").vehicle).toBe("foot");
  });

  it("finds a typed street address", () => {
    expect(fallbackIntent("drive to 4202 E Fowler Ave")).toEqual({
      kind: "address", addressText: "4202 E Fowler Ave", vehicle: "car",
    });
  });

  it("says unclear when nothing matches", () => {
    expect(fallbackIntent("hello there")).toEqual({ kind: "unclear", vehicle: "car" });
  });

  it("does not read 'over' or 'there' as ER", () => {
    expect(fallbackIntent("over there").kind).toBe("unclear");
  });
});

describe("checkIntent", () => {
  it("accepts a clean category answer", () => {
    expect(checkIntent('{"kind":"category","category":"grocery","vehicle":"car"}', "food")).toEqual({
      kind: "category", category: "grocery", vehicle: "car",
    });
  });
  it("refuses an address the person did not type", () => {
    expect(checkIntent('{"kind":"address","addressText":"1 Main St","vehicle":"car"}', "go home")).toBeNull();
  });
  it("refuses off-schema answers", () => {
    expect(checkIntent('{"kind":"category","category":"casino","vehicle":"car"}', "x")).toBeNull();
    expect(checkIntent("not json", "x")).toBeNull();
    expect(checkIntent('{"kind":"category","vehicle":"car"}', "x")).toBeNull();
  });
});

describe("parseIntent", () => {
  it("is off without a model", async () => {
    expect(await parseIntent("groceries", null)).toEqual({
      intent: { kind: "category", category: "grocery", vehicle: "car" }, source: "off",
    });
  });
  it("falls back when the model throws", async () => {
    const r = await parseIntent("hospital", async () => { throw new Error("503"); });
    expect(r).toEqual({ intent: { kind: "category", category: "hospital", vehicle: "car" }, source: "fallback" });
  });
  it("uses a sound model answer and sends the schema", async () => {
    let sawSchema = false;
    const r = await parseIntent("somewhere to buy milk", async ({ schema }) => {
      sawSchema = "properties" in schema;
      return '{"kind":"category","category":"grocery","vehicle":"foot"}';
    });
    expect(sawSchema).toBe(true);
    expect(r).toEqual({ intent: { kind: "category", category: "grocery", vehicle: "foot" }, source: "gemini" });
  });
});

describe("fallbackIntent, everyday words and typos", () => {
  it.each([
    ["fopod", "grocery"],
    ["I'm hungry", "grocery"],
    ["need water and diapers", "grocery"],
    ["groceires", "grocery"],
    ["my kid is sick", "hospital"],
    ["need my insulin", "pharmacy"],
    ["low on fuel", "gas"],
    ["somewhere dry to stay", "shelter"],
  ])("%s → %s", (text, category) => {
    expect(fallbackIntent(text)).toMatchObject({ kind: "category", category });
  });
  it("still says unclear for nonsense", () => {
    expect(fallbackIntent("blorp zzz").kind).toBe("unclear");
  });
});
