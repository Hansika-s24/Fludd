"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StepIllustration } from "@/components/illustrations";
import { AddressSearch } from "@/components/report-card/address-search";
import {
  currentPosition,
  EMPTY_PROFILE,
  saveProfile,
  useProfile,
  type DriveHabit,
  type FloodCover,
  type HomeType,
  type Profile,
  type Tenure,
} from "./profile";
import "./onboarding-screen.css";

type ScreenId =
  | "welcome" | "tenure" | "type" | "floor" | "address" | "park" | "drive"
  | "flood" | "contents" | "policy" | "camera" | "done";

/** The screens this person sees, in order. Follow-up questions appear only when an earlier answer calls for them. */
function screensFor(p: Profile): ScreenId[] {
  const s: ScreenId[] = ["welcome", "tenure", "type"];
  if (p.housing.type === "apartment" || p.housing.type === "condo") s.push("floor");
  s.push("address", "park");
  if (p.drives !== "no_car") s.push("drive");
  s.push("flood");
  if (p.housing.tenure === "rent") s.push("contents");
  s.push("policy");
  if (p.housing.tenure === "own" && (p.housing.type === "house" || p.housing.type === "townhouse")) s.push("camera");
  s.push("done");
  return s;
}

const TENURE: { key: Tenure; label: string }[] = [
  { key: "own", label: "I own my home" },
  { key: "rent", label: "I rent" },
];
const HOME_TYPES: { key: HomeType; label: string }[] = [
  { key: "house", label: "House" },
  { key: "apartment", label: "Apartment" },
  { key: "condo", label: "Condo" },
  { key: "townhouse", label: "Townhouse" },
  { key: "mobile_home", label: "Mobile home" },
];
const FLOORS: { key: number; label: string }[] = [
  { key: 1, label: "Ground floor" },
  { key: 2, label: "2nd floor" },
  { key: 3, label: "3rd floor" },
  { key: 4, label: "4th floor or higher" },
];
const DRIVES: { key: DriveHabit; label: string; hint: string }[] = [
  { key: "daily", label: "Every day", hint: "We'll warn you early, before the roads close" },
  { key: "weekly", label: "A few times a week", hint: "We'll tell you when to move the car" },
  { key: "rarely", label: "Rarely", hint: "Your car mostly sits, so where it's parked matters most" },
];
const FLOOD: { key: FloodCover; label: string }[] = [
  { key: "nfip", label: "Yes, through the NFIP" },
  { key: "private", label: "Yes, a private policy" },
  { key: "none", label: "No" },
  { key: "unsure", label: "Not sure" },
];
const YES_NO: { key: "yes" | "no"; label: string }[] = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
];

const FLOOD_WORDS: Record<FloodCover, string> = {
  nfip: "Flood policy through the NFIP",
  private: "Private flood policy",
  none: "No flood policy",
  unsure: "Not sure about flood cover",
};

/** Full-screen first-run flow. One question per screen, every screen skippable, everything stays on this device. */
export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const p = useProfile() ?? EMPTY_PROFILE;
  const [current, setCurrent] = useState<ScreenId>("welcome");
  const [history, setHistory] = useState<ScreenId[]>([]);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  const screens = screensFor(p);
  const index = Math.max(0, screens.indexOf(current));
  const progress = index / (screens.length - 1);

  useEffect(() => {
    if (current !== "welcome") headingRef.current?.focus({ preventScroll: true });
  }, [current]);

  /** Advance from the current screen; `after` is the profile as it will be once pending saves land. */
  function next(after: Profile = p) {
    const list = screensFor(after);
    const i = list.indexOf(current);
    const to = list[Math.min(list.length - 1, i + 1)];
    setError(null);
    setDir("forward");
    setHistory((h) => [...h, current]);
    setCurrent(to);
  }
  function back() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setError(null);
    setDir("back");
    setHistory((h) => h.slice(0, -1));
    setCurrent(prev);
  }
  function finish() {
    saveProfile({ done: true });
    onFinish();
  }
  function save(patch: Partial<Profile>): Profile {
    saveProfile(patch);
    return { ...p, ...patch };
  }

  async function atMyCar() {
    setLocating(true);
    setError(null);
    try {
      const position = await currentPosition();
      next(save({ car: { label: "Where you parked", position }, drives: p.drives === "no_car" ? null : p.drives }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  const heading = (text: string) => (
    <h1 id={titleId} ref={headingRef} tabIndex={-1} className="text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-balance outline-none">
      {text}
    </h1>
  );
  const lede = (text: ReactNode) => <p className="mt-3 text-body text-label-2 text-pretty">{text}</p>;

  let body: ReactNode = null;
  let footer: ReactNode = null;
  const continueBtn = (enabled: boolean, label = "Continue") => (
    <Primary onClick={() => next()} disabled={!enabled}>{label}</Primary>
  );

  switch (current) {
    case "welcome":
      body = (
        <div className="flex flex-1 flex-col justify-center pb-16">
          <StepIllustration step="welcome" className="mb-6 -ml-2 self-start" />
          <p className="text-[3.5rem] font-bold leading-none tracking-[-0.045em] text-tint">Fludd</p>
          <h1 id={titleId} className="mt-5 text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-balance">
            Know what the water will do before it does.
          </h1>
          <p className="mt-3 text-body text-label-2">A few quick questions make your flood report about your home. Everything stays on this device.</p>
        </div>
      );
      footer = (
        <>
          <Primary onClick={() => next()}>Get started</Primary>
          <Secondary onClick={finish}>I&apos;ll look around first</Secondary>
        </>
      );
      break;

    case "tenure":
      body = (
        <>
          {heading("Do you own or rent?")}
          {lede("Owners and renters protect different things in a flood.")}
          <Choices
            labelledBy={titleId}
            options={TENURE}
            value={p.housing.tenure}
            onPick={(tenure) => save({ housing: { ...p.housing, tenure } })}
          />
        </>
      );
      footer = continueBtn(p.housing.tenure !== null);
      break;

    case "type":
      body = (
        <>
          {heading("What kind of home?")}
          <Choices
            labelledBy={titleId}
            options={HOME_TYPES}
            value={p.housing.type}
            onPick={(type) =>
              save({ housing: { ...p.housing, type, floor: type === "apartment" || type === "condo" ? p.housing.floor : null } })
            }
          />
        </>
      );
      footer = continueBtn(p.housing.type !== null);
      break;

    case "floor":
      body = (
        <>
          {heading("Which floor do you live on?")}
          {lede("Water reaches the ground floor first. Higher up, your car and your way out matter most.")}
          <Choices
            labelledBy={titleId}
            options={FLOORS}
            value={p.housing.floor === null ? null : Math.min(4, p.housing.floor)}
            onPick={(floor) => save({ housing: { ...p.housing, floor } })}
          />
        </>
      );
      footer = continueBtn(p.housing.floor !== null);
      break;

    case "address":
      body = (
        <>
          {heading("Where do you live?")}
          {lede("Your home gets a flood grade, and we watch the water around it.")}
          <div className="mt-6">
            <AddressSearch
              onPick={(match, err) => {
                if (err || !match) return setError(err ?? "We couldn't find that address. Try the street number and name.");
                if (!match.inside) return setError(`${match.label.split(",")[0]} is outside the area around USF we cover. Try an address closer to campus.`);
                next(save({ home: { label: match.label, position: match.position } }));
              }}
            />
          </div>
          {p.home && (
            <p className="mt-4 text-subhead text-label-2">
              Saved: <span className="text-label">{p.home.label}</span>
            </p>
          )}
        </>
      );
      footer = continueBtn(p.home !== null);
      break;

    case "park":
      body = (
        <>
          {heading("Where do you park?")}
          {lede("Go stand next to your car, then tap. We'll tell you when to move it before the water gets there.")}
          {p.car && (
            <p className="mt-4 text-subhead text-label-2">
              Saved: <span className="text-label">{p.car.label}</span>
            </p>
          )}
        </>
      );
      footer = (
        <>
          <Primary onClick={atMyCar} disabled={locating}>{locating ? "Finding you…" : "I'm at my car"}</Primary>
          {p.home && (
            <Secondary
              onClick={() => {
                if (p.home) next(save({ car: { label: "At home", position: p.home.position }, drives: p.drives === "no_car" ? null : p.drives }));
              }}
            >
              I park at home
            </Secondary>
          )}
          <Secondary onClick={() => next(save({ car: null, drives: "no_car" }))}>I don&apos;t have a car</Secondary>
        </>
      );
      break;

    case "drive":
      body = (
        <>
          {heading("How often do you drive?")}
          <Choices labelledBy={titleId} options={DRIVES} value={p.drives} onPick={(drives) => save({ drives })} />
        </>
      );
      footer = continueBtn(p.drives !== null);
      break;

    case "flood":
      body = (
        <>
          {heading("Do you have flood insurance?")}
          {lede("Standard home and renters policies don't cover flood damage. It's a separate policy.")}
          <Choices
            labelledBy={titleId}
            options={FLOOD}
            value={p.insurance.flood}
            onPick={(flood) => save({ insurance: { ...p.insurance, flood } })}
          />
        </>
      );
      footer = continueBtn(p.insurance.flood !== null);
      break;

    case "contents":
      body = (
        <>
          {heading("Do you have renters insurance?")}
          {lede("Renters (contents) insurance covers your belongings, not the building.")}
          <Choices
            labelledBy={titleId}
            options={YES_NO}
            value={p.insurance.contents === null ? null : p.insurance.contents ? "yes" : "no"}
            onPick={(v) => save({ insurance: { ...p.insurance, contents: v === "yes" } })}
          />
        </>
      );
      footer = continueBtn(p.insurance.contents !== null);
      break;

    case "policy":
      body = (
        <>
          {heading("Save your policy for a flood day")}
          {lede("Saved on this device only. Handy when you need to file a claim.")}
          <div className="mt-6 overflow-hidden rounded-[var(--radius-group)] bg-group">
            <Field label="Insurance company" value={p.insurance.carrier} onChange={(carrier) => save({ insurance: { ...p.insurance, carrier } })} />
            <Field label="Policy number" value={p.insurance.policyNumber} onChange={(policyNumber) => save({ insurance: { ...p.insurance, policyNumber } })} />
            <Field label="Renewal date" type="date" value={p.insurance.renewal} onChange={(renewal) => save({ insurance: { ...p.insurance, renewal } })} last />
          </div>
          <p className="mt-3 px-1 text-footnote text-label-3">Optional. You can leave these blank.</p>
        </>
      );
      footer = continueBtn(true);
      break;

    case "camera":
      body = (
        <>
          {heading("Have a spare phone?")}
          {lede(
            "Completely optional. Prop an old phone in a window facing the street and Fludd can check how deep the water is during a storm, one still photo at a time. Nothing is recorded, and you set it up later under You.",
          )}
          <div className="mt-6 overflow-hidden rounded-[var(--radius-group)] bg-group">
            <label className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
              <span className="text-body">I&apos;d like a flood camera</span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={p.camera.optIn}
                aria-checked={p.camera.optIn}
                onChange={(e) => save({ camera: { optIn: e.target.checked, snapshotUrl: "" } })}
              />
            </label>
          </div>
        </>
      );
      footer = continueBtn(true);
      break;

    case "done":
      body = (
        <>
          {heading("You're set.")}
          {lede("Here's what Fludd saved on this device. You can change it any time.")}
          <dl className="mt-6 overflow-hidden rounded-[var(--radius-group)] bg-group">
            <Summary label="Home" value={p.home?.label ?? "Not set"} />
            <Summary label="Car" value={p.drives === "no_car" ? "No car" : (p.car?.label ?? "Not set")} />
            <Summary
              label="Insurance"
              value={p.insurance.flood ? FLOOD_WORDS[p.insurance.flood] : "Not set"}
              detail={p.insurance.carrier ? [p.insurance.carrier, p.insurance.policyNumber].filter(Boolean).join(", ") : undefined}
              last
            />
          </dl>
        </>
      );
      footer = <Primary onClick={finish}>Show me my home</Primary>;
      break;
  }

  const showChrome = current !== "welcome";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="ob-layer fixed inset-0 z-40 flex flex-col overflow-y-auto text-label
        pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]
        pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6">
        <header className="flex h-11 shrink-0 items-center gap-3">
          <div className="w-11 shrink-0">
            {showChrome && history.length > 0 && (
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                className="pressable -ml-3 grid size-11 place-items-center rounded-full text-tint active:bg-fill"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m15 5-7 7 7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1">
            {showChrome && (
              <div
                className="ob-progress h-1 overflow-hidden rounded-full bg-fill"
                role="progressbar"
                aria-label="Setup progress"
                aria-valuemin={0}
                aria-valuemax={screens.length - 1}
                aria-valuenow={index}
              >
                <span className="block h-full rounded-full bg-tint" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="flex w-11 shrink-0 justify-end">
            {showChrome && current !== "done" && (
              <button type="button" onClick={() => next()} className="-mr-2 min-h-11 px-2 text-body text-label-2">
                Skip
              </button>
            )}
          </div>
        </header>

        <main key={current} className={`flex flex-1 flex-col ${dir === "forward" ? "ob-forward" : "ob-back"}`}>
          <div className={`flex flex-1 flex-col ${current === "welcome" ? "" : "pt-10"}`}>
            {current !== "welcome" && <StepIllustration step={current} size={132} className="mb-5 -ml-2 self-start" />}
            {body}
            {error && (
              <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-group px-4 py-3 text-subhead">
                {error}
              </p>
            )}
          </div>
          <div className="mt-8 flex shrink-0 flex-col gap-1">{footer}</div>
        </main>
      </div>
    </div>
  );
}

function Primary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="pressable h-[3.25rem] w-full rounded-[0.875rem] bg-tint text-body font-semibold text-white active:bg-tint-pressed disabled:bg-fill disabled:text-label-3"
    >
      {children}
    </button>
  );
}

function Secondary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pressable min-h-12 w-full rounded-[0.875rem] text-body font-medium text-tint active:bg-fill">
      {children}
    </button>
  );
}

function Choices<K extends string | number>({
  options, value, onPick, labelledBy,
}: {
  options: { key: K; label: string; hint?: string }[];
  value: K | null;
  onPick: (k: K) => void;
  labelledBy: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="mt-7 overflow-hidden rounded-[var(--radius-group)] bg-group">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={String(o.key)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(o.key)}
            className="flex min-h-14 w-full items-center gap-3 border-b border-separator px-4 py-3 text-left transition-colors duration-100 last:border-b-0 active:bg-fill"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-body">{o.label}</span>
              {o.hint && <span className="block text-footnote text-label-2">{o.hint}</span>}
            </span>
            <span
              aria-hidden
              className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-150 ${on ? "bg-tint text-white" : "border-[1.5px] border-label-3/60"}`}
            >
              {on && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", hint, last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "url";
  hint?: string;
  last?: boolean;
}) {
  const id = useId();
  return (
    <div className={`px-4 py-2.5 ${last ? "" : "border-b border-separator"}`}>
      <label htmlFor={id} className="block text-footnote font-medium text-label-2">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 h-9 w-full bg-transparent text-body text-label outline-none placeholder:text-label-3 focus-visible:underline"
      />
      {hint && <p id={`${id}-hint`} className="text-footnote text-label-3">{hint}</p>}
    </div>
  );
}

function Summary({ label, value, detail, last }: { label: string; value: string; detail?: string; last?: boolean }) {
  return (
    <div className={`px-4 py-3 ${last ? "" : "border-b border-separator"}`}>
      <dt className="text-footnote text-label-2">{label}</dt>
      <dd className="text-body">{value}</dd>
      {detail && <dd className="text-footnote text-label-2">{detail}</dd>}
    </div>
  );
}
