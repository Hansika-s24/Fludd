"use client";

import { useSyncExternalStore } from "react";
import { useContributions } from "@/components/rewards/contributions";

const WEEK_MS = 7 * 24 * 3_600_000;
// The clock is read once in the browser, never during the server render.
const subscribeNever = () => () => {};
let weekStart: number | null = null;
const clientWeekStart = () => (weekStart ??= Date.now() - WEEK_MS);
/** Homes in a 150 m reach around one report, the Rewards panel's rule of thumb for "about a block". */
const BLOCK = "about a block of neighbours";

/** This week's contribution in one line, instead of a Rewards button. Opens the full Rewards view. */
export function WeeklyHighlight({ onOpen }: { onOpen: () => void }) {
  const list = useContributions();
  const since = useSyncExternalStore(subscribeNever, clientWeekStart, () => null);
  if (list === null || since === null) return null;
  const week = list.filter((c) => Date.parse(c.at) >= since && c.kind !== "onboarded");
  const reports = week.filter((c) => c.kind === "report" || c.kind === "camera").length;
  const helps = week.length - reports;

  const title = week.length === 0 ? "Help your block this week" : "Your week";
  const body =
    week.length === 0
      ? "Send a photo when you see flooding. Once a person checks it, neighbours see the water on the map before they drive into it."
      : [
          reports > 0 && `${reports} flood ${reports === 1 ? "photo" : "photos"} sent, each reaching ${BLOCK} before they drive.`,
          helps > 0 && `${helps} ${helps === 1 ? "good turn" : "good turns"}: inlets cleared, neighbours checked on, plans made.`,
        ]
          .filter(Boolean)
          .join(" ");

  return (
    <section className="px-4 pt-5">
      <button type="button" onClick={onOpen} className="pressable rise-in w-full rounded-[var(--radius-group)] bg-group px-4 py-3.5 text-left">
        <span className="flex items-center justify-between gap-3">
          <span className="text-headline font-semibold">{title}</span>
          <span className="text-subhead font-medium text-tint">See impact</span>
        </span>
        <span className="mt-1 block text-subhead text-label-2 text-pretty">{body}</span>
      </button>
    </section>
  );
}
