import { describe, expect, it } from "vitest";
import { campaignPrompt, findFoodCampaigns, parseCampaigns } from "@/lib/food/campaigns";

const ok = { title: "Mobile pantry", organizer: "Feeding Tampa Bay", when: "Sat Nov 22, 9 am", where: "1 Main St, Tampa", details: "Bring a bag", url: "https://feedingtampabay.org/events/1" };

describe("parseCampaigns", () => {
  it("reads a fenced JSON array and keeps valid events", () => {
    expect(parseCampaigns("Here you go:\n```json\n" + JSON.stringify([ok]) + "\n```")).toEqual([ok]);
  });
  it("drops events without an https source, duplicates and junk", () => {
    const noUrl = { ...ok, title: "No source", url: "" };
    const http = { ...ok, title: "Plain http", url: "http://x.org" };
    expect(parseCampaigns(JSON.stringify([ok, ok, noUrl, http, 7, null]))).toEqual([ok]);
  });
  it("fills a missing details field and returns [] for prose", () => {
    const { details: _d, ...bare } = ok;
    expect(parseCampaigns(JSON.stringify([bare]))[0].details).toBe("");
    expect(parseCampaigns("I could not find any events.")).toEqual([]);
    expect(parseCampaigns("[not json")).toEqual([]);
  });
});

describe("findFoodCampaigns", () => {
  it("asks once with today's date and returns events and sources", async () => {
    let asked = "";
    const r = await findFoodCampaigns(async (p) => {
      asked = p;
      return { text: JSON.stringify([ok]), sources: [{ title: "feedingtampabay.org", uri: "https://g/1" }] };
    }, "2026-11-21");
    expect(asked).toContain("Today is 2026-11-21");
    expect(asked).toBe(campaignPrompt("2026-11-21"));
    expect(r.campaigns).toHaveLength(1);
    expect(r.sources[0].title).toBe("feedingtampabay.org");
  });
});
