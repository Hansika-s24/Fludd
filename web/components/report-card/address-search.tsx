"use client";

import { useEffect, useId, useState } from "react";
import { resolveAddress, suggestAddresses } from "@/lib/address";
import type { AddressMatch, AddressSuggestion } from "@/lib/types";

const DEBOUNCE_MS = 250;

export function AddressSearch({ onPick }: { onPick: (match: AddressMatch | null, error?: string) => void }) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    if (text.trim().length < 3) return;
    let stale = false;
    const t = setTimeout(() => {
      suggestAddresses(text)
        .then((s) => {
          if (stale) return;
          setSuggestions(s.slice(0, 6));
          setActive(-1);
        })
        .catch(() => !stale && setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [text]);

  async function pick(s: AddressSuggestion) {
    setText(s.label);
    setOpen(false);
    try {
      onPick(await resolveAddress(s.id));
    } catch (e) {
      onPick(null, e instanceof Error ? e.message : "The address lookup failed");
    }
  }

  // Fewer than 3 letters: show nothing, without clearing state inside the effect.
  const shown = text.trim().length >= 3 ? suggestions : [];
  const showList = open && shown.length > 0;

  return (
    <form
      role="search"
      className="relative mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const s = shown[active >= 0 ? active : 0];
        if (s) void pick(s);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">Address near USF</label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Search an address near USF"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-11 w-full rounded-[var(--radius-control)] bg-fill px-3.5 text-body text-label
          placeholder:text-label-3 outline-none focus-visible:ring-2 focus-visible:ring-tint"
      />
      {showList && (
        <ul id={listId} role="listbox" className="mt-2 overflow-hidden rounded-[var(--radius-group)] bg-group">
          {shown.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => {
                e.preventDefault(); // keep focus; commit on release
              }}
              onClick={() => void pick(s)}
              className={`pressable flex min-h-11 cursor-default items-center border-b border-separator px-3.5 text-subhead last:border-b-0
                ${i === active ? "bg-fill" : ""} active:bg-fill`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
