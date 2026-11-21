"use client";

import { useState } from "react";
import { AddressSearch } from "@/components/report-card/address-search";
import { Group } from "@/components/ui/surface";
import { currentPosition, saveProfile, type DriveHabit, type Profile } from "./profile";

const DRIVE_OPTIONS: { key: DriveHabit; label: string; hint: string }[] = [
  { key: "daily", label: "Every day", hint: "We'll warn you early, before the roads close" },
  { key: "weekly", label: "A few times a week", hint: "We'll tell you when to move the car" },
  { key: "rarely", label: "Rarely", hint: "Your car mostly sits, so where it's parked matters most" },
  { key: "no_car", label: "I don't have a car", hint: "We'll focus on your home and getting out on foot" },
];

const STEPS = ["Home", "Car", "Driving"] as const;

/** Three short steps, each skippable. Everything stays on this device. */
export function Onboarding({ profile }: { profile: Profile }) {
  const [step, setStep] = useState(0);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    setError(null);
    if (step === STEPS.length - 1) saveProfile({ done: true });
    else setStep(step + 1);
  };

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    try {
      saveProfile({ car: { label: "Where you parked", position: await currentPosition() } });
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <section aria-labelledby="onboarding-title" className="onboarding-step" key={step}>
      <div className="px-5 pt-2">
        <p className="text-footnote font-medium text-label-2">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-1.5 flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-tint" : "bg-fill"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="px-4 pt-4">
          <h2 id="onboarding-title" className="px-1 text-headline font-semibold">Where do you live?</h2>
          <p className="mt-1 px-1 text-subhead text-label-2">
            Your home gets a flood grade, and we watch the water around it.
          </p>
          <AddressSearch
            onPick={(match, err) => {
              if (err || !match) return setError(err ?? "We couldn't find that address. Try the street number and name.");
              saveProfile({ home: { label: match.label, position: match.position } });
              next();
            }}
          />
        </div>
      )}

      {step === 1 && (
        <div className="px-4 pt-4">
          <h2 id="onboarding-title" className="px-1 text-headline font-semibold">Where do you park?</h2>
          <p className="mt-1 px-1 text-subhead text-label-2">
            Stand next to your car and tap the button. We&apos;ll tell you when to move it before the water gets there.
          </p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="pressable h-12 w-full rounded-[var(--radius-control)] bg-tint text-body font-semibold text-white active:bg-tint-pressed disabled:opacity-60"
            >
              {locating ? "Finding you…" : "I'm at my car"}
            </button>
            {profile.home && (
              <button
                type="button"
                onClick={() => {
                  if (profile.home) saveProfile({ car: { label: "At home", position: profile.home.position } });
                  next();
                }}
                className="pressable h-12 w-full rounded-[var(--radius-control)] bg-fill text-body font-medium text-tint"
              >
                I park at home
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-4 pt-4">
          <h2 id="onboarding-title" className="px-1 text-headline font-semibold">How often do you drive?</h2>
          <div role="radiogroup" aria-labelledby="onboarding-title" className="mt-3 overflow-hidden rounded-[var(--radius-group)] bg-group">
            {DRIVE_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={profile.drives === o.key}
                onClick={() => {
                  saveProfile({ drives: o.key, done: true });
                }}
                className="pressable flex min-h-14 w-full flex-col items-start justify-center border-b border-separator px-4 py-2 text-left last:border-b-0 active:bg-fill"
              >
                <span className="text-body">{o.label}</span>
                <span className="text-footnote text-label-2">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Group>
          <p role="alert" className="px-4 py-3 text-subhead">{error}</p>
        </Group>
      )}

      <div className="flex items-center justify-between px-5 pt-3">
        <button
          type="button"
          onClick={() => saveProfile({ done: true })}
          className="min-h-11 text-subhead text-label-2"
        >
          Set up later
        </button>
        {step > 0 && (
          <button type="button" onClick={next} className="min-h-11 text-subhead font-medium text-tint">
            Skip this step
          </button>
        )}
      </div>
      <p className="px-5 pt-1 text-footnote text-label-3">Stays on this device. We never send your address or parking spot anywhere.</p>
    </section>
  );
}
