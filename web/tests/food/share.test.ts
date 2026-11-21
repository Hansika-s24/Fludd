import { describe, expect, it } from "vitest";
import { covers, demandFor, giversFor, leaderboard, live, NewGiver, NewRequest, publicGiver, roughCount, toCell, type FoodRequest, type Giver } from "@/lib/food/share";

const NOW = Date.parse("2026-11-21T20:00:00Z");
const giver = (over: Partial<Giver> = {}): Giver => ({
  id: "g1", name: "Ella's Kitchen", address: "1 Main St", position: [-82.41, 28.06], radiusMi: 2,
  kinds: ["meals"], offer: "Hot meals", window: "Sat 11 am to 2 pm", served: 0, tokenHash: "secret", createdAt: "2026-11-21T18:00:00Z", ...over,
});
const req = (cell: [number, number], people = 2, ago = 3_600_000): FoodRequest => ({
  id: Math.random().toString(36), cell, people, needs: [], codeHash: "h", createdAt: new Date(NOW - ago).toISOString(),
});

describe("food share", () => {
  it("rounds a receiver to a ~500 m cell", () => {
    expect(toCell([-82.41234, 28.06178])).toEqual([-82.41, 28.06]);
    expect(toCell([-82.4126, 28.0626])).toEqual([-82.415, 28.065]);
  });

  it("matches givers whose radius reaches the cell, nearest first", () => {
    const near = giver({ id: "near", position: [-82.41, 28.06], radiusMi: 1 });
    const far = giver({ id: "far", position: [-82.44, 28.06], radiusMi: 3 });
    const out = giver({ id: "out", position: [-82.6, 28.06], radiusMi: 3 });
    expect(giversFor([-82.415, 28.06], [far, out, near]).map((g) => g.id)).toEqual(["near", "far"]);
    expect(covers(near, [-82.45, 28.06])).toBe(false);
    const grocer = giver({ id: "grocer", kinds: ["groceries", "water"] });
    expect(giversFor([-82.41, 28.06], [near, grocer], ["water"]).map((g) => g.id)).toEqual(["grocer"]);
    expect(giversFor([-82.41, 28.06], [near, grocer], []).map((g) => g.id)).toEqual(["near", "grocer"]);
  });

  it("shows a giver only rounded counts of live requests in reach", () => {
    const g = giver();
    const reqs = [req([-82.41, 28.06], 3), req([-82.415, 28.065], 1), req([-82.41, 28.06], 2, 49 * 3_600_000), req([-82.7, 28.06], 5)];
    expect(live(reqs, NOW)).toHaveLength(3);
    expect(demandFor(g, reqs, NOW)).toEqual({ requests: 4, people: 4 });
    expect(roughCount(0)).toBe(0);
    expect(roughCount(23)).toBe(25);
    expect(roughCount(147)).toBe(150);
  });

  it("ranks givers by people served and never exposes the token", () => {
    const board = leaderboard([giver({ name: "A", served: 7 }), giver({ name: "B", served: 312 }), giver({ name: "C", served: 0 })]);
    expect(board).toEqual([{ name: "B", served: 310, radiusMi: 2 }, { name: "A", served: 7, radiusMi: 2 }]);
    expect(publicGiver(giver())).not.toHaveProperty("tokenHash");
  });

  it("validates sign-ups and requests", () => {
    expect(NewGiver.safeParse({ name: "X", address: "1 Main St", position: [-82.4, 28], radiusMi: 2, kinds: ["meals"], offer: "Meals", window: "Today" }).success).toBe(false);
    expect(NewGiver.safeParse({ name: "Ella's", address: "1 Main St", position: [-82.4, 28], radiusMi: 4, kinds: ["meals"], offer: "Meals", window: "Today" }).success).toBe(false);
    expect(NewRequest.safeParse({ position: [-82.4, 28], people: 3 }).success).toBe(true);
    expect(NewRequest.safeParse({ position: [-82.4, 28], people: 40 }).success).toBe(false);
    expect(NewGiver.safeParse({ name: "Ella's", address: "1 Main St", position: [-82.4, 28], radiusMi: 2, kinds: [], offer: "Meals", window: "Today" }).success).toBe(false);
    expect(NewRequest.parse({ position: [-82.4, 28], people: 2 }).needs).toEqual([]);
  });
});
