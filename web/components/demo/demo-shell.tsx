"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export interface DemoStep {
  title: string;
  body: ReactNode;
}

/**
 * The frame every guided demo shares: the map (or any full-screen picture) behind, a card with the current
 * step and Back / Next, and a tag that stays on screen for as long as simulated content is shown.
 * Phones get the card along the bottom; wide screens get it as a column on the left.
 */
export function DemoShell({
  number,
  title,
  steps,
  step,
  onStep,
  simulated,
  children,
}: {
  number: 1 | 2 | 3 | 4;
  title: string;
  steps: DemoStep[];
  step: number;
  onStep: (next: number) => void;
  /** What is made up on this page, e.g. "simulated reports". Leave out when everything shown is real. */
  simulated?: string;
  children: ReactNode;
}) {
  const last = step === steps.length - 1;
  const current = steps[step];
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {children}

      <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex flex-wrap items-center gap-2 md:left-[412px]">
        <Link href="/demo" className="material-glass pressable pointer-events-auto flex h-9 items-center rounded-full px-3 text-footnote font-semibold text-tint">
          All demos
        </Link>
        <p className="material-glass flex h-9 items-center rounded-full px-3 text-footnote font-semibold">
          Demo {number} of 4 · {title}
        </p>
        {simulated && (
          <p className="flex h-9 items-center rounded-full bg-warn px-3 text-footnote font-semibold text-white" role="note">
            Demo: {simulated}
          </p>
        )}
      </div>

      <section
        aria-label={`${title}, step ${step + 1} of ${steps.length}`}
        className="material-thick fixed inset-x-0 bottom-0 z-20 flex max-h-[56dvh] flex-col rounded-t-[var(--radius-surface)] pb-[max(0.75rem,env(safe-area-inset-bottom))]
          md:inset-x-auto md:bottom-4 md:left-4 md:top-4 md:max-h-none md:w-[380px] md:rounded-[var(--radius-surface)]"
      >
        <div className="flex items-center gap-3 px-5 pt-4">
          <p className="text-footnote font-semibold text-label-2">
            Step {step + 1} of {steps.length}
          </p>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-fill" aria-hidden>
            <div
              className="h-full w-full origin-left rounded-full bg-tint transition-transform duration-300 ease-[var(--ease-calm)]"
              style={{ transform: `scaleX(${(step + 1) / steps.length})` }}
            />
          </div>
        </div>

        <div key={step} className="swap-in min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-3 [scrollbar-width:none]" aria-live="polite">
          <h1 className="text-balance text-title font-bold">{current.title}</h1>
          <div className="mt-2 space-y-3 text-subhead text-label">{current.body}</div>
        </div>

        <div className="flex gap-2 px-5 pt-2">
          <button
            type="button"
            onClick={() => onStep(step - 1)}
            disabled={step === 0}
            className="pressable min-h-12 flex-1 rounded-[var(--radius-control)] bg-fill px-4 text-body font-semibold text-label disabled:opacity-40"
          >
            Back
          </button>
          {last ? (
            <Link href="/" className="pressable grid min-h-12 flex-[2] place-items-center rounded-[var(--radius-control)] bg-tint px-4 text-body font-semibold text-white">
              Open Fludd
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onStep(step + 1)}
              className="pressable min-h-12 flex-[2] rounded-[var(--radius-control)] bg-tint px-4 text-body font-semibold text-white"
            >
              Next
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
