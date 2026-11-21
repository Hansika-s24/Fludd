// Body: the numbers for one address and hour (see guidanceInput in lib/gemini/schemas).
// Returns { text: string }, two or three sentences. Gemini may not add numbers or call a flooded
// road safe; with the provider off or failing, a fixed fallback comes back instead.
// Bad input -> 400 in the shared error shape.
import { getProvider, type TextProvider } from "@/lib/gemini";
import { handleGuidance } from "@/lib/gemini/handlers";

function provider(): TextProvider | null {
  try {
    return getProvider();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  return handleGuidance(request, provider());
}
