// Real-estate extra. Body: the numbers for one address (see remediesInput in lib/gemini/schemas).
// Returns { sentences: string[] }, 2 to 4. Gemini may not add numbers; with the provider off
// or failing, fixed fallback sentences come back instead. Bad input -> 400 in the shared error shape.
import { getProvider, type TextProvider } from "@/lib/gemini";
import { handleRemedies } from "@/lib/gemini/handlers";

function provider(): TextProvider | null {
  try {
    return getProvider();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  return handleRemedies(request, provider());
}
