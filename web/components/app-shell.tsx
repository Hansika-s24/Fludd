"use client";

import { useCallback, useEffect, useState } from "react";
import { onBootDone } from "@/components/boot/boot-signal";
import { MapView } from "@/components/map/map-view";
import { Onboarding } from "@/components/onboarding/onboarding";
import { forgetProfile, saveProfile, useProfile } from "@/components/onboarding/profile";
import { AddressSearch } from "@/components/report-card/address-search";
import { AfterPanel } from "@/components/stages/after-panel";
import { BeforePanel } from "@/components/stages/before-panel";
import { DuringPanel } from "@/components/stages/during-panel";
import type { Place } from "@/components/stages/shared";
import { StageControl, type Stage } from "@/components/stages/stage-control";
import { Greeting } from "@/components/ui/greeting";
import { Group, Surface } from "@/components/ui/surface";
import { loadGold } from "@/lib/data";
import { gradeFor } from "@/lib/grade";
import type { AddressMatch, GradeResult, Hour, Manifest, PumpState, Scenario } from "@/lib/types";

// Wording from prep/04-depth-model-and-routing.md section 5.3. Shown on every card.
const SAFETY_FOOTNOTE =
  "Screening estimate from a simplified model. It leaves out storm sewers, storm surge, river flooding and groundwater, and is checked against one storm. Not a FEMA flood determination, and not for insurance, lending or purchase decisions. In a storm, follow Hillsborough County Emergency Management and the National Weather Service. Never drive or walk into floodwater.";

// ponytail: hourZeroByScenario is in the real manifest but not yet in the Manifest type (note left for Hansika).
type ManifestWithClocks = Manifest & { hourZeroByScenario?: Partial<Record<Scenario, string>> };

/** Longest the map waits for the boot intro before flying in anyway. */
const INTRO_FALLBACK_MS = 6000;

type Graded = { place: Place; grade: GradeResult };

export function AppShell() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("before");
  const [scenario, setScenario] = useState<Scenario>("100yr");
  const [pump, setPump] = useState<PumpState>("on");
  const [hour, setHour] = useState<Hour>(14);
  const [manifest, setManifest] = useState<ManifestWithClocks | null>(null);
  const [searched, setSearched] = useState<Place | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);
  const onError = useCallback((m: string) => setError(m), []);

  useEffect(() => {
    loadGold().then((g) => setManifest(g.manifest), (e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));
  }, [onError]);

  // The intro hands over (or was never shown); never wait longer than the fallback.
  useEffect(() => {
    const go = () => setArrived(true);
    const off = onBootDone(go);
    const t = setTimeout(go, INTRO_FALLBACK_MS);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);

  // The place on the card: what was searched, else the saved home.
  const place: Place | null = searched ?? profile?.home ?? null;
  const placeKey = place ? place.position.join(",") : null;

  useEffect(() => {
    if (!place) return;
    let stale = false;
    gradeFor(place.position).then(
      (grade) => !stale && setGraded({ place, grade }),
      (e: unknown) => !stale && setError(e instanceof Error ? e.message : "The grade failed to load"),
    );
    return () => {
      stale = true;
    };
    // placeKey stands for place: a new object with the same position needs no new grade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  function onPick(match: AddressMatch | null, err?: string) {
    setError(null);
    if (err) return setError(err);
    if (!match) return setError("We couldn't find that address. Try the street number and name.");
    setSearched({ label: match.label, position: match.position });
  }

  const hours = manifest?.hours ?? 48;
  const safeHour = Math.min(hour, hours - 1);
  const hourZero = manifest?.hourZeroByScenario?.[scenario] ?? manifest?.hourZero ?? null;
  const current = graded && place && graded.place.position.join(",") === placeKey ? graded : null;
  const onboarding = profile !== null && !profile.done;
  const controls = {
    scenario, pump, hour: safeHour, hours, hourZero,
    onScenario: setScenario, onPump: setPump, onHour: setHour,
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView
        scenario={scenario}
        pump={pump}
        hour={safeHour}
        focus={searched?.position ?? null}
        pins={{ home: profile?.home?.position ?? null, car: profile?.car?.position ?? null }}
        arrived={arrived}
        onError={onError}
      />
      <Surface className={arrived ? "surface-arrive surface-shine" : "opacity-0"}>
        <Greeting
          homeLabel={profile?.home?.label.split(",")[0] ?? null}
          homeLetter={!searched && current?.grade.kind === "ok" ? current.grade.letter : null}
        />

        {onboarding && profile ? (
          <Onboarding profile={profile} />
        ) : (
          <>
            <div className="px-4">
              <AddressSearch onPick={onPick} />
            </div>
            <StageControl stage={stage} onChange={setStage} />

            {error && (
              <Group>
                <p role="alert" className="px-4 py-3 text-subhead">{error}</p>
              </Group>
            )}

            <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-${stage}`} aria-live="polite">
              {!place && (
                <Group>
                  <div className="px-4 py-5 text-center">
                    <p className="text-headline font-semibold">No address yet</p>
                    <p className="mt-1 text-subhead text-label-2">
                      Search for one to see its flood grade, where the water goes and when to move your car.
                    </p>
                    {profile && !profile.home && (
                      <button
                        type="button"
                        onClick={() => saveProfile({ done: false })}
                        className="mt-3 min-h-11 text-subhead font-medium text-tint"
                      >
                        Add your home
                      </button>
                    )}
                  </div>
                </Group>
              )}
              {place && !current && (
                <Group>
                  <p className="px-4 py-5 text-center text-subhead text-label-2">Grading {place.label}…</p>
                </Group>
              )}
              {current?.grade.kind === "outside" && (
                <Group>
                  <div className="px-4 py-4">
                    <p className="text-headline font-semibold">Outside the validated area</p>
                    <p className="mt-1 text-subhead text-label-2">
                      {current.place.label} is outside the area around USF that the model covers, so it gets no grade.
                    </p>
                  </div>
                </Group>
              )}
              {current?.grade.kind === "ok" && stage === "before" && (
                <BeforePanel key={placeKey} place={current.place} grade={current.grade} onPick={(p) => setSearched(p)} />
              )}
              {current?.grade.kind === "ok" && stage === "during" && (
                <DuringPanel key={placeKey} place={current.place} car={profile?.car ?? null} grade={current.grade} controls={controls} />
              )}
              {current?.grade.kind === "ok" && stage === "after" && (
                <AfterPanel
                  key={placeKey}
                  place={current.place}
                  grade={current.grade}
                  onReplay={() => {
                    setScenario("milton");
                    setPump("on");
                    setHour(24);
                    setStage("during");
                  }}
                />
              )}
            </div>

            {searched && profile?.home && (
              <div className="px-5 pt-3">
                <button type="button" onClick={() => setSearched(null)} className="min-h-11 text-subhead font-medium text-tint">
                  Back to your home
                </button>
              </div>
            )}

            <p className="px-7 pt-3 text-footnote text-label-3">{SAFETY_FOOTNOTE}</p>
            {profile?.done && (
              <div className="px-7 pt-1">
                <button type="button" onClick={forgetProfile} className="min-h-11 text-footnote text-label-2 underline">
                  Forget my home and car on this device
                </button>
              </div>
            )}
          </>
        )}
      </Surface>
    </main>
  );
}
