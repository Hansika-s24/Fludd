// Depth wording shared by the report flow and the admin screens. Inches first, centimetres beside.

const INCHES_PER_M = 39.3701;

export function inches(m: number): number {
  return Math.round(m * INCHES_PER_M);
}

export function centimetres(m: number): number {
  return Math.round(m * 100);
}

export function metresFromInches(inch: number): number {
  return inch / INCHES_PER_M;
}

/** "8 in (20 cm)" */
export function depthWords(m: number): string {
  return `${inches(m)} in (${centimetres(m)} cm)`;
}

/** "4 to 8 in (10 to 20 cm)", or one figure when both ends round the same. */
export function rangeWords([lo, hi]: [number, number]): string {
  if (inches(lo) === inches(hi)) return depthWords(lo);
  return `${inches(lo)} to ${inches(hi)} in (${centimetres(lo)} to ${centimetres(hi)} cm)`;
}

export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
