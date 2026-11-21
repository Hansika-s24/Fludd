// STUB (Harshith's 11:00 scaffold). Hansika replaces these; names and types stay as in docs/contracts.md.
import type { AddressMatch, AddressSuggestion } from "@/lib/types";

const TOY: (AddressSuggestion & AddressMatch)[] = [
  { id: "toy-1", label: "4202 E Fowler Ave, Tampa", position: [-82.4164, 28.0594], inside: true },
  { id: "toy-2", label: "13101 Bruce B Downs Blvd, Tampa", position: [-82.4114, 28.0594], inside: true },
  { id: "toy-3", label: "1 Far Away Rd, Tampa", position: [-82.5, 28.1], inside: false },
];

/** STUB: filters three toy addresses. */
export async function suggestAddresses(text: string): Promise<AddressSuggestion[]> {
  const q = text.trim().toLowerCase();
  return q ? TOY.filter((a) => a.label.toLowerCase().includes(q)).map(({ id, label }) => ({ id, label })) : [];
}

/** STUB */
export async function resolveAddress(suggestionId: string): Promise<AddressMatch | null> {
  const a = TOY.find((t) => t.id === suggestionId);
  return a ? { label: a.label, position: a.position, inside: a.inside } : null;
}
