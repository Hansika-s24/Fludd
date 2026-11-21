// Food distribution campaigns by governments and local organisations in Hillsborough County, found on the live web
// by a search agent (Gemini with Google Search grounding). Server only. Added at Harshith's request, 2026-11-21.
// Guards: every event needs an https source link; nothing without one is shown, and the app says "check the source".
import { z } from "zod";

export interface Campaign {
  title: string;
  organizer: string;
  when: string;
  where: string;
  details: string;
  url: string;
}

export interface SearchAnswer {
  text: string;
  /** Pages the search grounded on: title (usually the site) and link. */
  sources: { title: string; uri: string }[];
}

/** One grounded web search; injectable so tests never touch the network. */
export type SearchAsk = (prompt: string) => Promise<SearchAnswer>;

const Item = z.object({
  title: z.string().min(3).max(160),
  organizer: z.string().min(2).max(120),
  when: z.string().min(2).max(120),
  where: z.string().min(2).max(200),
  details: z.string().max(300).optional().default(""),
  url: z.string().url().refine((u) => u.startsWith("https://"), "https only"),
});

export const MAX_CAMPAIGNS = 8;

export function campaignPrompt(today: string): string {
  return [
    `Today is ${today}. Search the web for free food or water distribution events in Hillsborough County, Florida (Tampa, Temple Terrace, Plant City, Brandon)`,
    "run by government agencies (county, city, state, FEMA) or local organisations (food banks such as Feeding Tampa Bay, churches, nonprofits, schools).",
    "Include only events happening today or later, or standing weekly pantries with fixed hours.",
    `Answer with only a JSON array of at most ${MAX_CAMPAIGNS} objects with keys: title, organizer, when, where, details, url.`,
    "url must be the https page where the event is announced. If you find none, answer []. Do not invent events.",
  ].join(" ");
}

/** The first JSON array in a model answer, tolerating code fences and prose around it. */
export function parseCampaigns(text: string): Campaign[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Campaign[] = [];
  for (const r of raw) {
    const p = Item.safeParse(r);
    if (!p.success) continue;
    const key = `${p.data.title.toLowerCase()}|${p.data.when.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p.data);
    if (out.length >= MAX_CAMPAIGNS) break;
  }
  return out;
}

export async function findFoodCampaigns(ask: SearchAsk, today: string): Promise<{ campaigns: Campaign[]; sources: SearchAnswer["sources"] }> {
  const answer = await ask(campaignPrompt(today));
  return { campaigns: parseCampaigns(answer.text), sources: answer.sources.slice(0, 8) };
}
