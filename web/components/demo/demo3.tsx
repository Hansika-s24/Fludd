"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoShell, type DemoStep } from "@/components/demo/demo-shell";
import {
  CAMERA_FRAMES,
  CAMERA_SPOT,
  CAMERA_SPOT_LABEL,
  CAR_MOVE_DEPTH_M,
  bandOf,
  carWords,
  comparisonSentence,
  firstPastCarPoint,
  midDepth,
  referenceWords,
  trend,
  type Trend,
} from "@/components/demo/demo3-data";
import { Demo3Scene } from "@/components/demo/demo3-scene";
import { MapView, type MapMark } from "@/components/map/map-view";
import { inches, rangeWords } from "@/components/report/depth-words";
import { CountUp } from "@/components/ui/count-up";
import { DATA_SET } from "@/lib/config";
import { depthAt } from "@/lib/data";
import type { LngLat } from "@/lib/types";

const LAST = CAMERA_FRAMES.length - 1;
const MIDS = CAMERA_FRAMES.map(midDepth);
const PINS: { home: LngLat | null; car: LngLat | null } = { home: null, car: CAMERA_SPOT };
const NO_OVERLAYS: [] = [];
const AUTO_MS = 2000;

/** The model's depth at the camera's spot for each still's hour, read with depthAt() once the page is open. */
type ModelLine = { kind: "loading" } | { kind: "ok"; depthsM: number[] } | { kind: "unavailable" };

const TREND_MARK: Record<Trend, string> = { rising: "↑", steady: "→", falling: "↓" };

function FramePicker({ frame, onPick }: { frame: number; onPick: (i: number) => void }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Choose a still">
      {CAMERA_FRAMES.map((f, i) => (
        <button
          key={f.time}
          type="button"
          aria-pressed={i === frame}
          onClick={() => onPick(i)}
          className={`pressable min-h-11 flex-1 rounded-[var(--radius-control)] px-1 text-footnote font-semibold tabular-nums ${
            i === frame ? "bg-tint text-white" : "bg-fill text-label"
          }`}
        >
          {f.time}
        </button>
      ))}
    </div>
  );
}

/** What the camera would send for one still. */
function Reading({ frame }: { frame: number }) {
  const f = CAMERA_FRAMES[frame];
  const depth = MIDS[frame];
  const band = bandOf(depth);
  const moved = trend(frame === 0 ? null : MIDS[frame - 1], depth);
  return (
    <div className="rounded-[var(--radius-group)] bg-group px-4 py-3">
      <p className="text-footnote font-semibold text-label-2">The reading this still would send</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-title font-bold" style={{ color: band.color }}>
          <CountUp value={inches(depth)} ms={900} /> in
        </p>
        <p className="text-subhead font-semibold">{band.label}</p>
        <p className="ml-auto text-subhead tabular-nums text-label-2">{f.time}</p>
      </div>
      <dl key={frame} className="swap-in mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-subhead">
        <dt className="text-label-2">Range</dt>
        <dd>{rangeWords(f.rangeM)}</dd>
        <dt className="text-label-2">Against</dt>
        <dd>Water {referenceWords(depth)}</dd>
        <dt className="text-label-2">Since last still</dt>
        <dd>
          <span aria-hidden>{TREND_MARK[moved]} </span>
          {frame === 0 ? "First still, nothing to compare" : moved[0].toUpperCase() + moved.slice(1)}
        </dd>
      </dl>
    </div>
  );
}

// ---------- chart ----------

const W = 320;
const H = 164;
const LEFT = 30;
const RIGHT = 306;
const TOP = 12;
const BOTTOM = 132;
/** The app's band edges, as grid lines. The 1 ft line is also where a car should move (0.30 m). */
const GRID: readonly [depthM: number, label: string][] = [
  [0.1524, "6 in"],
  [CAR_MOVE_DEPTH_M, "1 ft"],
  [0.6096, "2 ft"],
];

function Chart({ model, frame }: { model: ModelLine; frame: number }) {
  const modelM = model.kind === "ok" ? model.depthsM : [];
  const top = Math.max(0.66, ...MIDS, ...modelM) * 1.06;
  const x = (i: number) => LEFT + 14 + (i / LAST) * (RIGHT - LEFT - 28);
  const y = (m: number) => BOTTOM - (m / top) * (BOTTOM - TOP);
  const line = (values: readonly number[]) => values.map((m, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(m).toFixed(1)}`).join("");
  const summary =
    model.kind === "ok"
      ? `Camera readings and the model's depth at ${CAMERA_SPOT_LABEL}, ${CAMERA_FRAMES[0].time} to ${CAMERA_FRAMES[LAST].time}`
      : `Camera readings at ${CAMERA_SPOT_LABEL}, ${CAMERA_FRAMES[0].time} to ${CAMERA_FRAMES[LAST].time}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
      <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke="var(--color-label-3)" strokeWidth="1" />
      {GRID.map(([m, label]) => {
        const car = m === CAR_MOVE_DEPTH_M;
        return (
          <g key={label}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={y(m)}
              y2={y(m)}
              stroke={car ? "var(--color-late)" : "var(--color-label-3)"}
              strokeWidth={car ? 1.4 : 0.7}
              strokeDasharray={car ? "5 4" : "2 4"}
              opacity={car ? 0.9 : 0.6}
            />
            <text x={LEFT - 4} y={y(m) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-label-2)">
              {label}
            </text>
            {car && (
              <text x={LEFT + 4} y={y(m) - 4} fontSize="10" fontWeight="600" fill="var(--color-late)">
                a car should move
              </text>
            )}
          </g>
        );
      })}
      {CAMERA_FRAMES.map((f, i) => (
        <text key={f.time} x={x(i)} y={BOTTOM + 15} textAnchor="middle" fontSize="10" fill="var(--color-label-2)" fontWeight={i === frame ? 700 : 400}>
          {f.time}
        </text>
      ))}

      {model.kind === "ok" && (
        <>
          <path className="draw-on" style={{ ["--i" as string]: 4 }} pathLength="1" d={line(modelM)} fill="none" stroke="var(--color-label)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {modelM.map((m, i) => (
            <rect key={i} x={x(i) - 3.2} y={y(m) - 3.2} width="6.4" height="6.4" rx="1.2" fill="var(--color-label)" stroke="white" strokeWidth="1.2" />
          ))}
        </>
      )}
      <path className="draw-on" pathLength="1" d={line(MIDS)} fill="none" stroke="var(--color-tint)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {MIDS.map((m, i) => (
        <circle key={i} cx={x(i)} cy={y(m)} r={i === frame ? 6 : 4} fill="var(--color-tint)" stroke="white" strokeWidth="1.6" />
      ))}
    </svg>
  );
}

// ---------- the walk ----------

export function Demo3() {
  const [step, setStep] = useState(0);
  const [frame, setFrame] = useState(0);
  const [auto, setAuto] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelLine>(DATA_SET === "real" ? { kind: "loading" } : { kind: "unavailable" });

  // The model's line: real depths from the gold files, or nothing. Never made up.
  useEffect(() => {
    if (DATA_SET !== "real") return;
    let live = true;
    // Parsing the gold files blocks the main thread for a moment; let the opening picture settle first.
    const timer = window.setTimeout(() => {
      Promise.all(CAMERA_FRAMES.map((f) => depthAt(CAMERA_SPOT, "100yr", "on", f.hour)))
        .then((results) => {
          if (!live) return;
          const depthsM = results.flatMap((r) => (r.kind === "ok" ? [r.depthM] : []));
          setModel(depthsM.length === CAMERA_FRAMES.length ? { kind: "ok", depthsM } : { kind: "unavailable" });
        })
        .catch(() => {
          if (live) setModel({ kind: "unavailable" });
        });
    }, 1200);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Step 2 plays the stills, one every two seconds, until the last one or the first tap. Not with reduced motion.
  useEffect(() => {
    if (step !== 1 || !auto || frame >= LAST) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setFrame((f) => Math.min(f + 1, LAST)), AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [step, auto, frame]);

  const go = (next: number) => {
    const to = Math.max(0, Math.min(4, next));
    setStep(to);
    if (to === 1) {
      setFrame(0);
      setAuto(true);
    } else if (to >= 2) {
      setFrame(LAST);
    }
  };
  const pick = (i: number) => {
    setAuto(false);
    setFrame(i);
  };

  const onMap = step >= 2;
  const depth = MIDS[frame];
  const band = bandOf(depth);
  const marks = useMemo<MapMark[]>(() => {
    if (!onMap) return [];
    const f = CAMERA_FRAMES[frame];
    const b = bandOf(MIDS[frame]);
    return [{ id: `cam-${frame}`, position: CAMERA_SPOT, color: b.color, size: b.ring, label: `Camera ${f.time}: ${b.label}` }];
  }, [onMap, frame]);

  const lastFrame = CAMERA_FRAMES[LAST];
  const past = firstPastCarPoint(CAMERA_FRAMES);

  const steps: DemoStep[] = [
    {
      title: "A spare phone in the window",
      body: (
        <>
          <p>
            Prop an old phone in a window that faces your parking spot. Fludd takes one still when you ask, or one every few minutes while it rains.
            Nothing is recorded and nothing is streamed.
          </p>
          <p className="text-label-2">From each still it reads one thing: how high the water stands against the kerb and the tyre.</p>
        </>
      ),
    },
    {
      title: "It reads the water",
      body: (
        <>
          <p className="text-label-2">Four stills from one evening, an hour apart.</p>
          <FramePicker frame={frame} onPick={pick} />
          <Reading frame={frame} />
        </>
      ),
    },
    {
      title: "Against the model",
      body: (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-tint" aria-hidden />
              Camera at your kerb (simulated)
            </span>
            {model.kind === "ok" && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[2px] bg-label" aria-hidden />
                Model at this spot, hurricane-level rain
              </span>
            )}
          </div>
          <Chart model={model} frame={frame} />
          <p className="font-semibold">
            {model.kind === "ok" && comparisonSentence(lastFrame.time, MIDS[LAST], model.depthsM[LAST])}
            {model.kind === "loading" && "Reading the model's depths for this spot."}
            {model.kind === "unavailable" && "Model line unavailable in this build"}
          </p>
          <FramePicker frame={frame} onPick={pick} />
          <p className="text-footnote text-label-2">
            The ring on the map is the camera&apos;s {CAMERA_FRAMES[frame].time} reading at {CAMERA_SPOT_LABEL}: {band.label}.
          </p>
        </>
      ),
    },
    {
      title: "Why it matters",
      body: (
        <>
          <ul className="space-y-2">
            {[
              "Area-wide data is not measured at your kerb.",
              "Your camera is.",
              "A person still checks each reading before it reaches the map.",
            ].map((line, i) => (
              <li key={line} className="rise-in flex gap-2" style={{ ["--i" as string]: i }}>
                <span className="mt-[0.45em] h-1.5 w-1.5 flex-none rounded-full bg-tint" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          <div className="rise-in rounded-[var(--radius-group)] bg-group px-4 py-3" style={{ ["--i" as string]: 3 }}>
            <p className="text-footnote font-semibold text-label-2">Move your car</p>
            {past ? (
              <p className="mt-0.5">
                At {past.time} the camera read {rangeWords(past.rangeM)}: <strong className="text-late">past the point where a car should move</strong>.
                That is the moment Fludd tells you, from your own kerb.
              </p>
            ) : (
              <p className="mt-0.5">{carWords(MIDS[LAST])}</p>
            )}
            <p className="mt-1 text-footnote text-label-2">No depth of water is safe to drive through.</p>
          </div>
        </>
      ),
    },
    {
      title: "Try it",
      body: (
        <>
          <p>Any phone with a browser and a view of the street will do. Leave it on a charger.</p>
          <Link href="/" className="pressable block rounded-[var(--radius-group)] bg-group px-4 py-3 font-semibold text-tint">
            Open Fludd, then You, then Flood camera, on a spare phone.
          </Link>
        </>
      ),
    },
  ];

  return (
    <DemoShell number={3} title="Your camera is a gauge" steps={steps} step={step} onStep={go} simulated="simulated camera">
      <MapView
        scenario="100yr"
        pump="on"
        hour={onMap ? CAMERA_FRAMES[frame].hour : lastFrame.hour}
        focus={CAMERA_SPOT}
        pins={PINS}
        arrived
        overlays={NO_OVERLAYS}
        route={null}
        marks={marks}
        onError={setMapError}
      />
      {!onMap && (
        <div className="swap-in absolute inset-0 z-10" style={{ background: "color-mix(in oklch, #9cc7ea 22%, white)" }}>
          <div className="flex h-[44dvh] items-end justify-center pb-2 md:h-full md:items-center md:pb-0 md:pl-[396px]">
            <Demo3Scene
              depthM={step === 1 ? depth : 0}
              stamp={step === 1 ? CAMERA_FRAMES[frame].time : undefined}
              className="h-[25dvh] w-auto md:h-[min(56dvh,460px)]"
            />
          </div>
        </div>
      )}
      {onMap && mapError && (
        <p role="status" className="material-glass absolute inset-x-3 top-[calc(env(safe-area-inset-top)+7rem)] z-10 rounded-[var(--radius-control)] px-3 py-2 text-footnote md:left-[412px]">
          {mapError}
        </p>
      )}
    </DemoShell>
  );
}
