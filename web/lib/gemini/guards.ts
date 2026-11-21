// Checks on model text before it reaches anyone. Pure functions, no network.

const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?/g;

/** Every number written in digits inside a value: strings, numbers, and nested keys and values. */
export function numbersIn(value: unknown): number[] {
  if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
  if (typeof value === "string") {
    return (value.match(NUMBER) ?? []).map((m) => Number(m.replace(/,/g, "")));
  }
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [...numbersIn(k), ...numbersIn(v)]);
  }
  return [];
}

/** Numbers in the output that do not appear in the input. Empty means the output is clean. */
export function inventedNumbers(output: string, input: unknown): number[] {
  const allowed = numbersIn(input);
  return numbersIn(output).filter((n) => !allowed.some((a) => Math.abs(a - n) < 1e-9));
}

const UNSAFE: RegExp[] = [
  /\bsafe(?:ly)?\s+to\s+(?:drive|cross|travel|pass|walk|wade)\b/gi,
  /\b(?:drive|driving|cross|crossing|go|going|wade|wading|walk|walking)\s+(?:through|across|into)\s+(?:(?:the|a|shallow|standing|flood|flooded|some)\s+)*(?:water|flood|floods|floodwater|street|road)\b/gi,
  /\bcross(?:ing)?\s+(?:the\s+|a\s+)?(?:flooded|water|flood)\b/gi,
  /\b(?:roads?|streets?|routes?)\b[^.;!?]{0,30}\bsafe\b/gi,
  /\bpassable\b/gi,
];

const NEGATION = /\b(?:not|never|no|avoid|don't|do not|cannot|can't|isn't|aren't|won't|shouldn't)\b|n't\b/i;

/** True if the text could be read as saying a flooded road is safe to use. Negated advice is fine. */
export function isUnsafe(text: string): boolean {
  for (const pattern of UNSAFE) {
    for (const m of text.matchAll(pattern)) {
      const before = text.slice(0, m.index);
      const clause = before.slice(Math.max(before.search(/[^.;:,!?]*$/), before.length - 30));
      if (!NEGATION.test(clause) && !NEGATION.test(m[0])) return true;
    }
  }
  return false;
}
