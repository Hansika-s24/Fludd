"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { DemoShell, type DemoStep } from "@/components/demo/demo-shell";
import { MapView } from "@/components/map/map-view";
import { REACH_RADIUS_M, countHomes, homesFrom } from "@/components/rewards/impact";
import { CountUp } from "@/components/ui/count-up";
import { STORM_WORDS } from "@/components/ui/storm-words";
import { depthAt, loadParcels } from "@/lib/data";
import {
  BAND_WORDS,
  DEMO_CENTRE,
  DEMO_HOUR,
  DEMO_PLACE,
  DEMO_PUMP,
  DEMO_REPORTS,
  DEMO_SCENARIO,
  compare,
  impassableReports,
  markFor,
  modelWords,
  readingWords,
  summarise,
  summarySentence,
  type Verdict,
} from "./demo1-data";

const STEP_COUNT = 5;
const REPORTS_STEP = 1;
/** The first report lands soon after the step opens, the rest about every 1.5 s. */
const FIRST_MS = 700;
const EVERY_MS = 1500;
const NO_MODEL = "Model value unavailable in this build";

const NO_PINS = { home: null, car: null };
const NO_OVERLAYS: [] = [];

/** Model depth at the crossing, then at each report, in order. null where the model has no value. */
type ModelDepths = "loading" | (number | null)[];

const VERDICT_CLASS: Record<Verdict, string> = { deeper: "text-late", shallower: "text-tint", agrees: "text-safe" };
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export function Demo1() {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [model, setModel] = useState<ModelDepths>("loading");
  const [homes, setHomes] = useState<number | "loading" | "unavailable">("loading");
  const [mapError, setMapError] = useState<string | null>(null);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
    // Once the person has left the arrivals step the reports are in: coming back shows them all at once.
    if (step === REPORTS_STEP && clamped !== REPORTS_STEP) setShown(DEMO_REPORTS.length);
    setStep(clamped);
  };

  // Reports arrive one at a time while their step is open.
  useEffect(() => {
    if (step !== REPORTS_STEP || shown >= DEMO_REPORTS.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? FIRST_MS : EVERY_MS);
    return () => window.clearTimeout(t);
  }, [step, shown]);

  // The model's own depth at the crossing and at every report. Read from the data files, never typed in.
  useEffect(() => {
    let live = true;
    const spots = [DEMO_CENTRE, ...DEMO_REPORTS.map((r) => r.position)];
    Promise.all(spots.map((p) => depthAt(p, DEMO_SCENARIO, DEMO_PUMP, DEMO_HOUR)))
      .then((results) => {
        if (live) setModel(results.map((r) => (r.kind === "ok" ? r.depthM : null)));
      })
      .catch(() => {
        if (live) setModel(spots.map(() => null));
      });
    return () => {
      live = false;
    };
  }, []);

  // Homes within one block of the reports, counted from the county parcel records.
  useEffect(() => {
    let live = true;
    loadParcels()
      .then((parcels) => {
        if (live) setHomes(countHomes(DEMO_REPORTS.map((r) => r.position), homesFrom(parcels)));
      })
      .catch(() => {
        if (live) setHomes("unavailable");
      });
    return () => {
      live = false;
    };
  }, []);

  const visible = step === 0 ? 0 : step === REPORTS_STEP ? shown : DEMO_REPORTS.length;
  const marks = useMemo(() => DEMO_REPORTS.slice(0, visible).map(markFor), [visible]);

  const modelAt = (i: number): number | null => (model === "loading" ? null : model[i + 1]);
  const centreM = model === "loading" ? null : model[0];
  const summary = summarise(DEMO_REPORTS.map((r, i) => ({ band: r.band, modelM: modelAt(i) })));
  const impassable = impassableReports(DEMO_REPORTS);
  const storm = STORM_WORDS[DEMO_SCENARIO];

  const steps: DemoStep[] = [
    {
      title: "The model's map",
      body: (
        <>
          <p>
            This is what Fludd&apos;s model draws for {storm.name.toLowerCase()}, pumps running, {DEMO_HOUR} hours in. The pin is a
            crossing on {DEMO_PLACE}.
          </p>
          <p className="rounded-[var(--radius-control)] bg-group px-3 py-2">
            <span className="text-footnote text-label-2">Model at the pin</span>
            <br />
            <span className="text-headline font-semibold">
              {model === "loading" ? "Reading the model…" : centreM === null ? NO_MODEL : modelWords(centreM)}
            </span>
          </p>
          <p className="text-label-2">A model is a careful guess. Next: what people standing there say.</p>
        </>
      ),
    },
    {
      title: "Reports arrive",
      body: (
        <>
          <p className="text-label-2">Residents photograph the water against something of known height. Initials only, never a name.</p>
          <ul className="space-y-1.5">
            {DEMO_REPORTS.slice(0, visible).map((r) => (
              <li key={r.id} className="rise-in flex items-center gap-2 rounded-[var(--radius-control)] bg-group px-3 py-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: markFor(r).color }}
                />
                <span>
                  <span className="font-semibold">{r.initials}</span>
                  <span className="text-label-2"> · {r.minutesAgo} min ago · </span>
                  {readingWords(r)}
                </span>
              </li>
            ))}
          </ul>
          {visible < DEMO_REPORTS.length && (
            <p className="flex items-center gap-2 text-footnote text-label-2">
              <span className="typing" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {visible === 0 ? "Waiting for the first report" : `${visible} of ${DEMO_REPORTS.length} in`}
            </p>
          )}
        </>
      ),
    },
    {
      title: "Model against residents",
      body: (
        <>
          <ul className="space-y-1.5">
            {DEMO_REPORTS.map((r, i) => {
              const m = modelAt(i);
              const c = compare(r.band, m);
              return (
                <li key={r.id} className="rise-in rounded-[var(--radius-control)] bg-group px-3 py-2 text-footnote" style={stagger(i)}>
                  <span className="font-semibold">{r.initials}</span>
                  <span className="text-label-2"> · Model here: </span>
                  {model === "loading" ? "reading…" : m === null ? NO_MODEL : modelWords(m)}
                  <span className="text-label-2"> · Resident measured: </span>
                  {BAND_WORDS[r.band]}
                  {c && <span className={`font-semibold ${VERDICT_CLASS[c.verdict]}`}> · {c.verdict}</span>}
                </li>
              );
            })}
          </ul>
          <p className="font-semibold">{model === "loading" ? "Reading the model…" : summarySentence(summary)}</p>
          {summary.compared > 0 && (
            <p className="text-footnote text-label-2">
              Deeper {summary.deeper} · shallower {summary.shallower} · agrees {summary.agree}. A reading is a band, so it is counted as the middle of
              that band.
            </p>
          )}
        </>
      ),
    },
    {
      title: "What it changes",
      body: (
        <>
          <div className="rise-in rounded-[var(--radius-control)] bg-group px-3 py-2">
            <p className="text-headline font-semibold text-late">
              {impassable.length} of {DEMO_REPORTS.length} reported impassable to cars
            </p>
            <p className="text-footnote text-label-2">
              {impassable.length > 0 ? `${impassable.map((r) => r.initials).join(", ")}: water at about 1 ft or more. ` : ""}
              The other reports are not a go-ahead. Fludd never calls a flooded road safe.
            </p>
          </div>
          <div className="rise-in rounded-[var(--radius-control)] bg-group px-3 py-2" style={stagger(1)}>
            <p className="text-headline font-semibold">
              {typeof homes === "number" && homes > 0 ? (
                <>
                  <CountUp value={homes} /> homes within {REACH_RADIUS_M} m
                </>
              ) : homes === "loading" ? (
                "Counting homes nearby…"
              ) : (
                "Homes nearby"
              )}
            </p>
            <p className="text-footnote text-label-2">
              {typeof homes === "number" && homes > 0
                ? "Counted from county parcel records. These are the people who would drive into that water."
                : "The people on these blocks are the ones who would drive into that water."}
            </p>
          </div>
        </>
      ),
    },
    {
      title: "This is the real flow",
      body: (
        <>
          <p className="text-label-2">These six reports were simulated. The real ones work the same way.</p>
          <Link href="/" className="pressable rise-in block rounded-[var(--radius-control)] bg-group px-3 py-3 font-semibold text-tint">
            Send a real report from Home
          </Link>
          <Link href="/admin" className="pressable rise-in block rounded-[var(--radius-control)] bg-group px-3 py-3 font-semibold text-tint" style={stagger(1)}>
            Every photo is checked by a person before it reaches the map
          </Link>
        </>
      ),
    },
  ];

  return (
    <DemoShell number={1} title="Neighbours report" steps={steps} step={step} onStep={go} simulated="simulated reports">
      <MapView
        scenario={DEMO_SCENARIO}
        pump={DEMO_PUMP}
        hour={DEMO_HOUR}
        focus={DEMO_CENTRE}
        pins={NO_PINS}
        arrived
        overlays={NO_OVERLAYS}
        route={null}
        marks={marks}
        onError={setMapError}
      />
      {mapError && (
        <p role="alert" className="material-glass fixed inset-x-3 top-[calc(env(safe-area-inset-top)+6.5rem)] z-20 rounded-[var(--radius-control)] px-3 py-2 text-footnote md:left-[412px]">
          {mapError}
        </p>
      )}
    </DemoShell>
  );
}
