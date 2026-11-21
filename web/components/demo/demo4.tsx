"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { DemoShell, type DemoStep } from "@/components/demo/demo-shell";
import { MapView } from "@/components/map/map-view";
import { STORM_WORDS } from "@/components/ui/storm-words";
import { depthAt } from "@/lib/data";
import { modelWords } from "./demo1-data";
import {
  ASKER_POSITION,
  DEMO_GIVERS,
  DEMO_HOUR,
  DEMO_PLACE,
  DEMO_PUMP,
  DEMO_SCENARIO,
  MAX_PEOPLE,
  MIN_PEOPLE,
  askerMark,
  clampPeople,
  countWords,
  distanceWords,
  giverMarks,
  isHidden,
  matchGivers,
  pickupCode,
  roundPosition,
} from "./demo4-data";

const STEP_COUNT = 5;
const GIVERS_STEP = 1;
const WATER_STEP = 2;
const ASK_STEP = 3;
/** The first giver appears soon after the step opens, the rest about every 1.3 s. */
const FIRST_MS = 600;
const EVERY_MS = 1300;
const NO_MODEL = "Model value unavailable in this build";

const NO_PINS = { home: null, car: null };
const NO_OVERLAYS: [] = [];
const CARD = "rounded-[var(--radius-control)] bg-group px-3 py-2";

/** Model depth at each giver's door, in the order of DEMO_GIVERS. null where the model has no value. */
type Depths = "loading" | (number | null)[];
interface Ask {
  code: string;
  people: number;
}

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
/** A number in [0, 1) from the browser's own random source. Only ever called from a click. */
const browserRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export function Demo4() {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [depths, setDepths] = useState<Depths>("loading");
  const [people, setPeople] = useState(2);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
    // Once the person has left the givers step they are all in: coming back shows them at once.
    if (step === GIVERS_STEP && clamped !== GIVERS_STEP) setShown(DEMO_GIVERS.length);
    setStep(clamped);
  };

  // Givers appear one at a time while their step is open.
  useEffect(() => {
    if (step !== GIVERS_STEP || shown >= DEMO_GIVERS.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? FIRST_MS : EVERY_MS);
    return () => window.clearTimeout(t);
  }, [step, shown]);

  // The model's own depth at every giver's door. Read from the data files, never typed in.
  useEffect(() => {
    let live = true;
    Promise.all(DEMO_GIVERS.map((g) => depthAt(g.position, DEMO_SCENARIO, DEMO_PUMP, DEMO_HOUR)))
      .then((results) => {
        if (live) setDepths(results.map((r) => (r.kind === "ok" ? r.depthM : null)));
      })
      .catch(() => {
        if (live) setDepths(DEMO_GIVERS.map(() => null));
      });
    return () => {
      live = false;
    };
  }, []);

  const depthList = useMemo(() => (depths === "loading" ? DEMO_GIVERS.map(() => null) : depths), [depths]);
  const hidden = useMemo(() => depthList.map(isHidden), [depthList]);
  const noModel = depths !== "loading" && depths.every((d) => d === null);
  const rounded = useMemo(() => roundPosition(ASKER_POSITION), []);
  const matches = useMemo(() => matchGivers(DEMO_GIVERS, depthList, rounded), [depthList, rounded]);
  const hiddenCount = hidden.filter(Boolean).length;

  const visible = step === 0 ? 0 : step === GIVERS_STEP ? shown : DEMO_GIVERS.length;
  const asked = ask !== null && step >= ASK_STEP;
  const marks = useMemo(() => {
    const givers = giverMarks(DEMO_GIVERS.slice(0, visible), step >= WATER_STEP ? hidden : []);
    return asked ? [askerMark(ASKER_POSITION), ...givers] : givers;
  }, [visible, step, hidden, asked]);

  const storm = STORM_WORDS[DEMO_SCENARIO];

  const steps: DemoStep[] = [
    {
      title: "The street cannot cook",
      body: (
        <>
          <p>
            {storm.name}, {DEMO_HOUR} hours in, around {DEMO_PLACE}. The power is out and the roads are under water.
          </p>
          <p className={CARD}>
            <span className="font-semibold">Food exists a mile away, with no way to find it.</span>
            <br />
            <span className="text-footnote text-label-2">A restaurant has meals it cannot sell. A street has no way to cook.</span>
          </p>
          <p className="text-footnote text-label-2">The water on the map is the model&apos;s. Everything about food from here on is simulated.</p>
        </>
      ),
    },
    {
      title: "A restaurant offers",
      body: (
        <>
          <p className="text-label-2">
            A giver signs up with an offer, a pickup window and a reach of 1, 2 or 3 miles. A person checks every giver before it goes live.
          </p>
          <ul className="space-y-1.5">
            {DEMO_GIVERS.slice(0, visible).map((g) => (
              <li key={g.id} className={`rise-in ${CARD}`}>
                <span className="font-semibold">{g.name}</span>
                <span className="text-label-2"> · {g.offer}</span>
                <br />
                <span className="text-footnote text-label-2">
                  Pickup {g.pickupWindow} · reach {g.reachMiles} mi
                </span>
              </li>
            ))}
          </ul>
          {visible < DEMO_GIVERS.length ? (
            <p className="flex items-center gap-2 text-footnote text-label-2">
              <span className="typing" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {visible === 0 ? "Waiting for the first offer" : `${visible} of ${DEMO_GIVERS.length} live`}
            </p>
          ) : (
            <p className="text-footnote text-label-2">Invented names. The pale ring stands for reach and is not drawn to scale.</p>
          )}
        </>
      ),
    },
    {
      title: "Never send people through water",
      body: (
        <>
          <p className="text-label-2">
            Walking rule, stricter than the 0.30 m used for cars: a pickup is hidden where the model shows 0.15 m (6 in) or more at its door.
          </p>
          <ul className="space-y-1.5">
            {DEMO_GIVERS.map((g, i) => {
              const d = depthList[i];
              return (
                <li key={g.id} className={`rise-in ${CARD}`} style={stagger(i)}>
                  <span className="font-semibold">{g.name}</span>
                  <br />
                  <span className="text-footnote">
                    <span className="text-label-2">Model at the door: </span>
                    {depths === "loading" ? "reading…" : d === null ? NO_MODEL : modelWords(d)}
                    {hidden[i] ? (
                      <span className="font-semibold text-warn"> · hidden while its street is under water</span>
                    ) : (
                      depths !== "loading" && d !== null && <span className="text-label-2"> · still listed</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-footnote text-label-2">
            {noModel ? `${NO_MODEL}, so no giver is hidden here. ` : ""}
            Still listed is not a go-ahead. Never drive or walk into floodwater.
          </p>
        </>
      ),
    },
    {
      title: "Ask, without a name",
      body: (
        <>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-[var(--radius-control)] bg-fill" role="group" aria-label="How many people">
              <button
                type="button"
                aria-label="One person fewer"
                disabled={people <= MIN_PEOPLE}
                onClick={() => setPeople((n) => clampPeople(n - 1))}
                className="pressable grid h-12 w-11 place-items-center text-title font-semibold disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-16 text-center text-footnote font-semibold" aria-live="polite">
                {people} {people === 1 ? "person" : "people"}
              </span>
              <button
                type="button"
                aria-label="One person more"
                disabled={people >= MAX_PEOPLE}
                onClick={() => setPeople((n) => clampPeople(n + 1))}
                className="pressable grid h-12 w-11 place-items-center text-title font-semibold disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAsk({ code: pickupCode(browserRandom), people })}
              className="pressable min-h-12 flex-1 rounded-[var(--radius-control)] bg-tint px-3 text-body font-semibold text-white"
            >
              I need food
            </button>
          </div>
          <p className="text-footnote text-label-2">
            No name, no phone, no email. Your position is rounded to about 500 m. Simulated: nothing leaves this page.
          </p>

          {ask && (
            <>
              <div key={ask.code} className={`pop-in ${CARD} flex items-center justify-between gap-3`}>
                <span className="text-footnote text-label-2">
                  Your pickup code, made in this browser.
                  <br />
                  Show it at the counter. It carries no identity.
                </span>
                <span className="font-mono text-title font-bold tracking-widest text-tint">{ask.code}</span>
              </div>

              {matches.length === 0 ? (
                <p className={CARD}>No giver in reach is listed right now.</p>
              ) : (
                <ul className="space-y-1.5">
                  {matches.map((m, i) => (
                    <li key={m.giver.id} className={`rise-in ${CARD}`} style={stagger(i)}>
                      <span className="font-semibold">{m.giver.name}</span>
                      <span className="text-label-2"> · about {distanceWords(m.distanceM)}</span>
                      <br />
                      <span className="text-footnote text-label-2">
                        {m.giver.offer} · pickup {m.giver.pickupWindow}
                      </span>
                      <br />
                      <span className="text-footnote">
                        <span className="text-label-2">The giver sees only: </span>
                        <span className="font-semibold">{countWords(m.giver.earlierPeople + ask.people)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-footnote text-label-2">
                Nearest first, measured from the rounded position.
                {hiddenCount > 0 ? ` ${hiddenCount} of ${DEMO_GIVERS.length} givers ${hiddenCount === 1 ? "is" : "are"} left out while under water.` : ""} A count under 100 is
                rounded to the nearest 10, so it cannot point to one household.
              </p>
            </>
          )}
        </>
      ),
    },
    {
      title: "What is real today",
      body: (
        <>
          <div className={`rise-in ${CARD}`}>
            <p className="font-semibold text-safe">Real now</p>
            <p className="text-footnote text-label-2">
              The Food &amp; help panel in the app: mapped food banks and shelters, 911 and 211. And the design for this, in the repo
              (docs/food-share.md).
            </p>
          </div>
          <div className={`rise-in ${CARD}`} style={stagger(1)}>
            <p className="font-semibold text-warn">Not built</p>
            <p className="text-footnote text-label-2">
              The giver and receiver portals shown here. The givers, offers, counts and code on this page were simulated in your browser.
            </p>
          </div>
          <Link href="/" className={`pressable rise-in block ${CARD} py-3 font-semibold text-tint`} style={stagger(2)}>
            Open Fludd, then Food &amp; help
          </Link>
        </>
      ),
    },
  ];

  return (
    <DemoShell number={4} title="Food after the flood" steps={steps} step={step} onStep={go} simulated="simulated offers">
      <MapView
        scenario={DEMO_SCENARIO}
        pump={DEMO_PUMP}
        hour={DEMO_HOUR}
        focus={ASKER_POSITION}
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
