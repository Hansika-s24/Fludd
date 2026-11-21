"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DemoShell, type DemoStep } from "@/components/demo/demo-shell";
import { MapView, type MapMark } from "@/components/map/map-view";
import { checklist, type Lens, type Level } from "@/components/property-check/checklist";
import { mapVerdictTitle, plainStorms } from "@/components/report-card/plain-words";
import { gradeFor } from "@/lib/grade";
import { findBetterOptions } from "@/lib/parcels";
import type { BetterOption, Grade, LngLat } from "@/lib/types";
import { ADDRESSES, distanceWords, letterTone, midpoint, money, usableGrades, weakerIndex } from "./demo2-data";

const STEP_COUNT = 4;
/** Hurricane-level rain is at its highest on the map from about this hour. */
const PEAK_HOUR = 23;
const BOTH: LngLat = midpoint(ADDRESSES[0].position, ADDRESSES[1].position);
const NEEDS_REAL = "This demo needs the real data set";
const NO_PINS = { home: null, car: null };
const NO_OVERLAYS: [] = [];
const MAX_OPTIONS_SHOWN = 4;

const LENSES: { key: Lens; label: string }[] = [
  { key: "buying", label: "Buying" },
  { key: "renting", label: "Renting" },
  { key: "building", label: "Building" },
];
// The word carries the meaning; the colour only repeats it.
const LEVEL: Record<Level, { word: string; text: string; dot: string }> = {
  good: { word: "Looks fine", text: "text-safe", dot: "bg-safe" },
  watch: { word: "Check this", text: "text-warn", dot: "bg-warn" },
  act: { word: "Act on this", text: "text-late", dot: "bg-late" },
};

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
const segment = (on: boolean) =>
  `pressable min-h-11 rounded-[var(--radius-control)] px-2 text-subhead font-semibold transition-colors duration-150 ${on ? "bg-tint text-white" : "bg-fill text-label"}`;

type Grades = [Grade, Grade] | "missing" | null;

/**
 * Demo 2, "Moving or building": two real addresses on one street, graded by the real model when the page
 * opens. Nothing here is simulated. The camera only moves on a tap (Next, Back, a card or a tab).
 */
export function Demo2() {
  const [step, setStep] = useState(0);
  const [grades, setGrades] = useState<Grades>(null);
  const [options, setOptions] = useState<BetterOption[] | null>(null);
  const [card, setCard] = useState<number | null>(null);
  const [tab, setTab] = useState<number | null>(null);
  const [lens, setLens] = useState<Lens>("buying");
  const [focus, setFocus] = useState<LngLat>(BOTH);
  const [mapError, setMapError] = useState<string | null>(null);

  // Both grades, once, from the same function the report card uses.
  useEffect(() => {
    let stale = false;
    Promise.all(ADDRESSES.map((a) => gradeFor(a.position))).then(
      (results) => !stale && setGrades(usableGrades(results) ?? "missing"),
      () => !stale && setGrades("missing"),
    );
    return () => {
      stale = true;
    };
  }, []);

  const graded = grades !== null && grades !== "missing" ? grades : null;
  const weak = graded ? weakerIndex([graded[0].letter, graded[1].letter]) : null;

  // Similar homes with a better grade near the weaker address.
  useEffect(() => {
    if (weak === null) return;
    let stale = false;
    findBetterOptions(ADDRESSES[weak].position).then(
      (found) => !stale && setOptions(found),
      () => !stale && setOptions([]),
    );
    return () => {
      stale = true;
    };
  }, [weak]);

  // The map drops a camera move made before it has loaded, so the first view is asked for once more.
  useEffect(() => {
    const t = window.setTimeout(() => setFocus((f) => [f[0], f[1]]), 2500);
    return () => window.clearTimeout(t);
  }, []);

  /** A fresh array each time: the map flies whenever the focus it is handed is a new one. */
  const flyTo = (p: LngLat) => setFocus([p[0], p[1]]);

  const go = (next: number) => {
    const to = Math.max(0, Math.min(STEP_COUNT - 1, next));
    setStep(to);
    if (to === 0) flyTo(BOTH);
    else if (to === 1) flyTo(card === null ? BOTH : ADDRESSES[card].position);
    else if (to === 2) flyTo(ADDRESSES[tab ?? weak ?? 1].position);
    else flyTo(ADDRESSES[weak ?? 1].position);
  };

  // The rings keep the tint until the grades are on screen, so step 1 does not give the answer away.
  // A new id makes the ring enter again in its meaning colour.
  const marks = useMemo<MapMark[]>(
    () =>
      ADDRESSES.map((a, i) => {
        const letter = step > 0 && graded ? graded[i].letter : null;
        return {
          id: letter ? `${a.id}-${letter}` : a.id,
          position: a.position,
          color: letter ? letterTone(letter).color : "var(--color-tint)",
          size: 24,
          label: a.short,
        };
      }),
    [step, graded],
  );
  const onError = useCallback((m: string) => setMapError(m), []);

  const waiting = grades === null ? <p className="text-label-2">Working out both grades…</p> : <p className="font-semibold">{NEEDS_REAL}</p>;
  const shownTab = tab ?? weak ?? 1;

  const steps: DemoStep[] = [
    {
      title: "Two homes, one question",
      body: (
        <>
          <ul className="overflow-hidden rounded-[var(--radius-group)] bg-group">
            {ADDRESSES.map((a, i) => (
              <li key={a.id} className={`rise-in flex min-h-11 items-center gap-3 px-4 ${i > 0 ? "border-t border-separator" : ""}`} style={stagger(i)}>
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full border-2 border-tint" />
                <span className="font-semibold">{a.label}</span>
              </li>
            ))}
          </ul>
          <p className="rise-in" style={stagger(2)}>
            Two real homes on the same street. Which would you sign for?
          </p>
        </>
      ),
    },
    {
      title: "What the official map says, and what the model found",
      body: graded ? (
        <>
          {ADDRESSES.map((a, i) => {
            const g = graded[i];
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={card === i}
                onClick={() => {
                  setCard(i);
                  flyTo(a.position);
                }}
                className={`pressable rise-in flex w-full items-start gap-3 rounded-[var(--radius-group)] bg-group px-4 py-3 text-left ${card === i ? "outline outline-2 outline-tint" : ""}`}
                style={stagger(i)}
              >
                <span className={`pop-in w-12 shrink-0 text-center text-grade font-bold ${letterTone(g.letter).text}`} aria-label={`Grade ${g.letter}`}>
                  {g.letter}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-headline font-semibold">{a.label}</span>
                  <span className="block text-footnote font-semibold text-label-2">{mapVerdictTitle(g)}</span>
                  <span className="mt-1.5 block text-footnote text-label-2">Official map says</span>
                  <span className="block text-subhead">{g.officialMapSays}</span>
                  <span className="mt-1 block text-footnote text-label-2">We found</span>
                  <span className="block text-subhead">{plainStorms(g.weFound)}</span>
                </span>
              </button>
            );
          })}
          <p className="text-footnote text-label-2">Tap a card to fly to that home. The map shows hurricane-level rain at its peak.</p>
        </>
      ) : (
        waiting
      ),
    },
    {
      title: "The checklist",
      body: graded ? (
        <>
          <div role="tablist" aria-label="Which home" className="grid grid-cols-2 gap-1">
            {ADDRESSES.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={shownTab === i}
                onClick={() => {
                  setTab(i);
                  flyTo(a.position);
                }}
                className={segment(shownTab === i)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="What are you planning for this address?" className="grid grid-cols-3 gap-1">
            {LENSES.map((l) => (
              <button key={l.key} type="button" role="radio" aria-checked={lens === l.key} onClick={() => setLens(l.key)} className={segment(lens === l.key)}>
                {l.label}
              </button>
            ))}
          </div>
          <ul key={`${shownTab}-${lens}`} className="overflow-hidden rounded-[var(--radius-group)] bg-group" aria-live="polite">
            {checklist(lens, graded[shownTab]).map((item, i) => (
              <li key={item.title} className={`rise-in px-4 py-3 ${i > 0 ? "border-t border-separator" : ""}`} style={stagger(Math.min(i, 6))}>
                <p className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.title}</span>
                  <span className={`flex shrink-0 items-center gap-1.5 text-footnote font-medium ${LEVEL[item.level].text}`}>
                    <span aria-hidden className={`h-2 w-2 rounded-full ${LEVEL[item.level].dot}`} />
                    {LEVEL[item.level].word}
                  </span>
                </p>
                <p className="mt-0.5">{plainStorms(item.finding)}</p>
                <p className="mt-0.5 text-label-2">{item.todo}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        waiting
      ),
    },
    {
      title: "A better option nearby",
      body:
        graded && weak !== null ? (
          <>
            <p>
              Similar homes within a mile of {ADDRESSES[weak].label} (grade {graded[weak].letter}) that the model grades better.
            </p>
            {options === null ? (
              <p className="text-label-2">Looking at homes within a mile…</p>
            ) : options.length === 0 ? (
              <p className="font-semibold">No similar home within a mile has a better grade.</p>
            ) : (
              <ul className="overflow-hidden rounded-[var(--radius-group)] bg-group">
                {options.slice(0, MAX_OPTIONS_SHOWN).map((o, i) => (
                  <li key={`${o.address}-${o.distanceM}`} className={`rise-in flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-separator" : ""}`} style={stagger(i)}>
                    <span className={`w-7 shrink-0 text-center text-title font-bold ${letterTone(o.grade).text}`} aria-label={`Grade ${o.grade}`}>
                      {o.grade}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{o.address}</span>
                      <span className="block text-footnote text-label-2">
                        {distanceWords(o.distanceM)} away · {money(o.assessedValue)} assessed · {o.beds} bd · {o.baths} ba
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-footnote text-label-2">A screening estimate, not a flood determination.</p>
          </>
        ) : (
          waiting
        ),
    },
  ];

  return (
    <DemoShell number={2} title="Moving or building" steps={steps} step={step} onStep={go}>
      <MapView scenario="100yr" pump="on" hour={PEAK_HOUR} focus={focus} pins={NO_PINS} arrived overlays={NO_OVERLAYS} route={null} marks={marks} onError={onError} />
      {mapError && (
        <p role="alert" className="material-glass fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 rounded-[var(--radius-control)] px-3 py-2 text-footnote md:left-[412px]">
          {mapError}
        </p>
      )}
    </DemoShell>
  );
}
