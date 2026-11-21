"use client";

import { useCallback, useEffect, useState } from "react";
import { onBootDone } from "@/components/boot/boot-signal";
import { FloodCamera } from "@/components/camera/flood-camera";
import { EmptyAddressIllustration } from "@/components/illustrations";
import { MapView, RAMP } from "@/components/map/map-view";
import { StormControls } from "@/components/map/storm-controls";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { forgetProfile, saveProfile, useProfile } from "@/components/onboarding/profile";
import { AskPelican } from "@/components/pelican/ask-pelican";
import { recordContribution } from "@/components/rewards/contributions";
import { RewardsPanel } from "@/components/rewards/rewards-panel";
import { AddressSearch } from "@/components/report-card/address-search";
import { ValidationPanel } from "@/components/report-card/validation-panel";
import { AfterPanel } from "@/components/stages/after-panel";
import { BeforePanel } from "@/components/stages/before-panel";
import { DuringPanel } from "@/components/stages/during-panel";
import { Icon, ListRow, type Place } from "@/components/stages/shared";
import { StageControl, type Stage } from "@/components/stages/stage-control";
import { SHEET_HALF_EVENT, Sheet } from "@/components/ui/sheet";
import { Logo } from "@/components/ui/logo";
import { Group } from "@/components/ui/surface";
import { ICONS, Shortcuts, type Tab } from "@/components/ui/tab-bar";
import { loadGold } from "@/lib/data";
import { reverseGeocode } from "@/lib/address";
import { gradeFor } from "@/lib/grade";
import type { AddressMatch, GradeResult, Hour, LayerName, LngLat, Manifest, PumpState, Scenario } from "@/lib/types";

// Wording from prep/04-depth-model-and-routing.md section 5.3. Shown on every card.
const SAFETY_FOOTNOTE =
  "Screening estimate from a simplified model. It leaves out storm sewers, storm surge, river flooding and groundwater, and is checked against one storm. Not a FEMA flood determination, and not for insurance, lending or purchase decisions. In a storm, follow Hillsborough County Emergency Management and the National Weather Service. Never drive or walk into floodwater.";

// ponytail: hourZeroByScenario is in the real manifest but not yet in the Manifest type (note left for Hansika).
type ManifestWithClocks = Manifest & { hourZeroByScenario?: Partial<Record<Scenario, string>> };

/** Drainage network layers shown by the map's Drainage button. */
const DRAINAGE: LayerName[] = ["storm-pipes", "ponds", "drains", "outfalls", "pump-stations"];

/** Longest the map waits for the boot intro before flying in anyway. */
const INTRO_FALLBACK_MS = 6000;

const COVER_WORDS: Record<string, string> = {
  nfip: "Flood insurance through the NFIP",
  private: "A private flood policy",
  none: "No flood insurance",
  unsure: "Not sure about flood insurance",
};

const TITLES: Record<Tab, string> = { home: "Home", live: "Live", ask: "Ask Pelican", rewards: "Rewards", you: "You" };

type Graded = { place: Place; grade: GradeResult };

export function AppShell() {
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>("home");
  const [stage, setStage] = useState<Stage>("before");
  const [scenario, setScenario] = useState<Scenario>("100yr");
  const [pump, setPump] = useState<PumpState>("on");
  const [hour, setHour] = useState<Hour>(14);
  const [manifest, setManifest] = useState<ManifestWithClocks | null>(null);
  const [searched, setSearched] = useState<Place | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);
  const [drainage, setDrainage] = useState(false);
  const [route, setRoute] = useState<LngLat[] | null>(null);
  const onError = useCallback((m: string) => setError(m), []);

  // The flood data loads once the intro is out of the way, so parsing it never freezes the intro film.
  useEffect(() => {
    if (!arrived) return;
    loadGold().then((g) => setManifest(g.manifest), (e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));
  }, [arrived, onError]);

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
    if (!place || !arrived) return;
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
  }, [placeKey, arrived]);

  function onPick(match: AddressMatch | null, err?: string) {
    setError(null);
    if (err) return setError(err);
    if (!match) return setError("We couldn't find that address. Try the street number and name.");
    setSearched({ label: match.label, position: match.position });
    setRoute(null);
  }

  // A tap on the map: that building becomes the place on the card, named by its street address when there is one.
  async function selectSpot(position: LngLat) {
    setError(null);
    setRoute(null);
    setTab("home");
    window.dispatchEvent(new Event(SHEET_HALF_EVENT));
    const label = await Promise.race([
      reverseGeocode(position).catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), 1500)),
    ]);
    setSearched({ label: label ?? "Selected building", position });
  }

  const hours = manifest?.hours ?? 48;
  const safeHour = Math.min(hour, hours - 1);
  const hourZero = manifest?.hourZeroByScenario?.[scenario] ?? manifest?.hourZero ?? null;
  const current = graded && place && graded.place.position.join(",") === placeKey ? graded : null;
  const ok = current?.grade.kind === "ok" ? { place: current.place, grade: current.grade } : null;
  const onboarding = profile !== null && !profile.done;
  const controls = {
    scenario, pump, hour: safeHour, hours, hourZero,
    // A suggested route belongs to one storm, pump state and hour: drop it when they change.
    onScenario: (s: Scenario) => { setScenario(s); setRoute(null); },
    onPump: (p: PumpState) => { setPump(p); setRoute(null); },
    onHour: (h: Hour) => { setHour(h); setRoute(null); },
  };

  const placeState = (
    <>
      {error && (
        <Group>
          <p role="alert" className="px-4 py-3 text-subhead">{error}</p>
        </Group>
      )}
      {!place && (
        <Group>
          <div className="flex flex-col items-center px-4 py-5 text-center">
            <EmptyAddressIllustration size={120} className="mb-3" />
            <p className="text-headline font-semibold">No address yet</p>
            <p className="mt-1 text-subhead text-label-2">Search for one, or set up your home.</p>
            {profile && !profile.home && (
              <button type="button" onClick={() => saveProfile({ done: false })} className="mt-3 min-h-11 text-subhead font-medium text-tint">
                Set up your home
              </button>
            )}
          </div>
        </Group>
      )}
      {place && !current && (
        <Group>
          <p className="px-4 py-5 text-center text-subhead text-label-2">Checking {place.label.split(",")[0]}…</p>
        </Group>
      )}
      {current?.grade.kind === "outside" && (
        <Group>
          <div className="px-4 py-4">
            <p className="text-headline font-semibold">Outside the area we cover</p>
            <p className="mt-1 text-subhead text-label-2">
              {current.place.label} is outside the area around USF that the model covers, so it gets no grade.
            </p>
          </div>
        </Group>
      )}
    </>
  );

  // Home shows your home again: drop a searched address if there is a home to go back to.
  // Before, during and after a flood at one address. The stage sets the map too: After replays Milton at its peak.
  const pickStage = (s: Stage) => {
    setStage(s);
    setRoute(null);
    if (s === "after") {
      setScenario("milton");
      setPump("on");
      setHour(24);
    } else if (scenario === "milton" && s === "before") setScenario("100yr");
  };
  const open = (t: Tab) => {
    // Every shortcut shows its content: raise the sheet off peek.
    window.dispatchEvent(new Event(SHEET_HALF_EVENT));
    // Live is the During stage of Home.
    if (t === "live") {
      setTab("home");
      pickStage("during");
      return;
    }
    if (t === "home") {
      if (profile?.home) setSearched(null);
      setStage("before");
    }
    setTab(t);
  };

  // Maps-style: a search field with your avatar, round shortcuts under it; a section opens as a card with a close button.
  const header =
    tab === "home" ? (
      <>
        <div className="flex items-start gap-2 px-4">
          <div className="min-w-0 flex-1">
            <AddressSearch onPick={onPick} />
          </div>
          <button
            type="button"
            aria-label="You"
            onClick={() => open("you")}
            className="pressable mt-3 grid size-11 shrink-0 place-items-center rounded-full bg-fill text-tint"
          >
            {ICONS.you}
          </button>
        </div>
        <Shortcuts tab={tab === "home" && stage === "during" ? "live" : tab} onOpen={open} homeLetter={!searched && ok ? ok.grade.letter : null} />
      </>
    ) : (
      <div className="flex items-center justify-between gap-3 pb-2 pl-5 pr-2 pt-1">
        <h1 className="text-title font-bold">{TITLES[tab]}</h1>
        <button type="button" aria-label="Close" onClick={() => open("home")} className="pressable grid size-11 place-items-center">
          <span className="grid size-[1.875rem] place-items-center rounded-full bg-fill text-label-2" aria-hidden>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m2 2 8 8M10 2l-8 8" />
            </svg>
          </span>
        </button>
      </div>
    );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <p
        translate="no"
        className="material-glass pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex h-11 items-center rounded-full pl-2 pr-4 md:left-[412px]"
      >
        <Logo size={30} />
      </p>
      {/* Key for the floodwater colours: shallow to deep. Lakes stay the basemap's pale blue. */}
      <div
        aria-label="Floodwater depth: 6 inches to over 4 feet"
        role="img"
        className="material-glass pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+4rem)] z-10 rounded-[0.75rem] px-2.5 py-1.5 md:left-[412px]"
      >
        <p className="text-[0.6875rem] font-semibold text-label-2">Floodwater</p>
        <div className="mt-1 flex h-2 w-28 overflow-hidden rounded-full">
          {[1, 2, 3, 4, 5].map((k) => (
            <span key={k} className="flex-1" style={{ background: `rgb(${RAMP[k - 1].slice(1).join(" ")})` }} />
          ))}
        </div>
        <div className="mt-0.5 flex w-28 justify-between text-[0.625rem] tabular-nums text-label-2">
          <span>6 in</span>
          <span>2 ft</span>
          <span>4 ft+</span>
        </div>
      </div>
      {/* First open: full-screen onboarding, after the intro has handed over so it never sits under the video. */}
      {arrived && onboarding && (
        <OnboardingScreen
          onFinish={() => {
            setSearched(null);
            recordContribution("onboarded");
          }}
        />
      )}
      <MapView
        scenario={scenario}
        pump={pump}
        hour={safeHour}
        focus={searched?.position ?? profile?.home?.position ?? null}
        pins={{ home: profile?.home?.position ?? null, car: profile?.car?.position ?? null }}
        arrived={arrived}
        overlays={drainage ? DRAINAGE : []}
        route={route}
        onSelect={selectSpot}
        onError={onError}
      />
      <button
        type="button"
        aria-pressed={drainage}
        onClick={() => setDrainage((d) => !d)}
        className={`pressable fixed right-3 top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 h-11 rounded-full px-4 text-subhead font-semibold
          ${drainage ? "bg-tint text-white" : "material-glass text-label"}`}
      >
        Drainage
      </button>

      <Sheet header={header} scrollKey={`${tab}-${stage}`} className={arrived ? "surface-arrive surface-shine" : "opacity-0"}>
        <div key={tab} id="tab-panel" role="region" aria-label={TITLES[tab]} className="tab-enter" aria-live="polite">
          {tab === "home" && (
            <>
              <StageControl stage={stage} onChange={pickStage} />
              {placeState}
              {stage === "before" && ok && <BeforePanel key={placeKey} place={ok.place} grade={ok.grade} onPick={(p) => setSearched(p)} />}
              {stage === "during" &&
                (ok ? (
                  <DuringPanel key={placeKey} place={ok.place} car={profile?.car ?? null} grade={ok.grade} controls={controls} />
                ) : (
                  <Group title="Storm">
                    <StormControls {...controls} />
                  </Group>
                ))}
              {stage === "after" && ok && (
                <AfterPanel
                  key={`after-${placeKey}`}
                  place={ok.place}
                  grade={ok.grade}
                  onReplay={() => {
                    controls.onScenario("milton");
                    setPump("on");
                    setHour(24);
                    setStage("during");
                  }}
                />
              )}
              {stage === "before" && <ValidationPanel />}
              {searched && profile?.home && (
                <div className="px-5 pt-3">
                  <button type="button" onClick={() => setSearched(null)} className="min-h-11 text-subhead font-medium text-tint">
                    Back to your home
                  </button>
                </div>
              )}
            </>
          )}

          {tab === "ask" && (
            <Group>
              <AskPelican
                key={`${placeKey}-${scenario}-${pump}-${safeHour}`}
                from={profile?.car?.position ?? place?.position ?? null}
                scenario={scenario}
                pump={pump}
                hour={safeHour}
                hourZero={hourZero}
                onRoute={setRoute}
              />
            </Group>
          )}

          {tab === "rewards" && <RewardsPanel />}

          {tab === "you" && profile && (
            <>
              <Group title="Your places">
                <ListRow icon={Icon.home} label="Home" value={profile.home?.label.split(",")[0] ?? "Not set"} />
                <ListRow icon={Icon.car} label="Car" value={profile.car ? profile.car.label : "Not set"} last />
              </Group>
              <Group title="Insurance">
                <ListRow
                  icon={Icon.wrench}
                  label="Flood cover"
                  value={profile.insurance.flood ? COVER_WORDS[profile.insurance.flood] : "Not answered"}
                  detail={
                    [profile.insurance.carrier, profile.insurance.policyNumber && `Policy ${profile.insurance.policyNumber}`, profile.insurance.renewal && `Renews ${profile.insurance.renewal}`]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  last
                />
              </Group>
              <Group title="Flood camera">
                <FloodCamera home={profile.home?.position ?? null} />
              </Group>
              <div className="space-y-1 px-5 pt-3">
                <button type="button" onClick={() => saveProfile({ done: false })} className="block min-h-11 text-subhead font-medium text-tint">
                  Redo setup
                </button>
                <button type="button" onClick={forgetProfile} className="block min-h-11 text-subhead text-late">
                  Forget my home, car and insurance on this device
                </button>
              </div>
            </>
          )}

          <details className="group px-5 pt-5 text-footnote text-label-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span>Screening estimate. Never drive or walk into floodwater.</span>
              <span className="shrink-0 font-medium text-tint group-open:hidden">About</span>
            </summary>
            <p className="max-w-[65ch] text-pretty pb-2 text-label-3">{SAFETY_FOOTNOTE}</p>
          </details>
        </div>
      </Sheet>
    </main>
  );
}
