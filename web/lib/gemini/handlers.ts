// Server only. The logic behind POST /api/gemini/remedies and POST /api/gemini/guidance.
// The routes pass in the provider; tests pass in fakes. Every failure ends in fixed fallback text.
import { z } from "zod";
import { apiError } from "@/lib/api";
import { describeError } from "./gemini";
import { inventedNumbers, isUnsafe } from "./guards";
import type { TextProvider } from "./provider";
import { guidanceFacts, guidanceInput, remediesFacts, remediesInput } from "./schemas";

export const REMEDIES_FALLBACK: string[] = [
  "Raising the lowest floor above the modelled flood level is the most effective way to lower the risk here.",
  "Flood vents, raised utilities and grading the lot so water runs away from the building all help.",
  "Flood insurance is worth pricing even outside the high-risk zone on the official map.",
];

export const GUIDANCE_FALLBACK =
  "Check the water depth and the move-by time on this page. Move your car to higher ground before the roads close. Never drive through flood water: turn around, don't drown.";

const RULES = [
  "Use only the facts given. Do not invent facts.",
  "Do not add any number that is not in the facts. Copy numbers exactly as written: no unit conversions, no rounding, no prices, no percentages, no counts.",
  "Never say or imply that a flooded road is safe to drive, walk or cross.",
  "Plain words a worried resident understands. No markdown, no lists, no greetings, no questions.",
  'Answer as JSON {"sentences": [...]}, one sentence per item.',
].join("\n");

const REMEDIES_SYSTEM = `You write for Fludd, a flood report card for homes near the University of South Florida in Tampa.
Write 2 to 4 short sentences on what would lower flood risk at this address, chosen to fit the facts: for example raising the floor above the modelled water level, flood vents, raising utilities, a backflow valve, grading the lot so water drains away, or flood insurance.
${RULES}`;

const GUIDANCE_SYSTEM = `You write for Fludd, a flood report card for homes near the University of South Florida in Tampa.
Write 2 or 3 short sentences of guidance for this address at this hour of the storm: how much water is at the door, when to move the car and where to, and that nobody should drive through flood water.
${RULES}`;

type Source = "gemini" | "fallback" | "off";

const answer = (body: unknown, source: Source) =>
  Response.json(body, { headers: { "x-fludd-text-source": source, "cache-control": "no-store" } });

async function readInput<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) return { ok: false, res: apiError(400, "bad_request", "JSON body required") };
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return { ok: false, res: apiError(400, "bad_request", `${where}${issue?.message ?? "invalid body"}`) };
  }
  return { ok: true, data: parsed.data };
}

/** Asks the provider and checks the answer. Returns null if anything is wrong. */
async function sentencesFrom(
  provider: TextProvider,
  system: string,
  facts: object,
  minItems: number,
  maxItems: number,
): Promise<string[] | null> {
  const input = JSON.stringify(facts, null, 2);
  let raw: string;
  try {
    raw = await provider.generate({ system, input, minItems, maxItems });
  } catch (err) {
    console.warn(`[gemini] provider ${provider.name} failed, using fallback: ${describeError(err)}`);
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.warn("[gemini] answer was not JSON, using fallback");
    return null;
  }
  const parsed = z
    .object({ sentences: z.array(z.string().trim().min(1).max(400)).min(minItems).max(maxItems) })
    .safeParse(json);
  if (!parsed.success) {
    console.warn("[gemini] answer had the wrong shape, using fallback");
    return null;
  }
  const text = parsed.data.sentences.join(" ");
  const invented = inventedNumbers(text, facts);
  if (invented.length > 0) {
    console.warn(`[gemini] answer added numbers ${invented.join(", ")}, using fallback`);
    return null;
  }
  if (isUnsafe(text)) {
    console.warn("[gemini] answer had unsafe road wording, using fallback");
    return null;
  }
  return parsed.data.sentences;
}

export async function handleRemedies(request: Request, provider: TextProvider | null): Promise<Response> {
  const input = await readInput(request, remediesInput);
  if (!input.ok) return input.res;
  if (!provider) return answer({ sentences: REMEDIES_FALLBACK }, "off");
  const sentences = await sentencesFrom(provider, REMEDIES_SYSTEM, remediesFacts(input.data), 2, 4);
  return sentences
    ? answer({ sentences }, "gemini")
    : answer({ sentences: REMEDIES_FALLBACK }, "fallback");
}

export async function handleGuidance(request: Request, provider: TextProvider | null): Promise<Response> {
  const input = await readInput(request, guidanceInput);
  if (!input.ok) return input.res;
  if (!provider) return answer({ text: GUIDANCE_FALLBACK }, "off");
  const sentences = await sentencesFrom(provider, GUIDANCE_SYSTEM, guidanceFacts(input.data), 2, 3);
  return sentences
    ? answer({ text: sentences.join(" ") }, "gemini")
    : answer({ text: GUIDANCE_FALLBACK }, "fallback");
}
