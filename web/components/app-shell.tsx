"use client";

import { useCallback, useEffect, useState } from "react";
import { onBootDone } from "@/components/boot/boot-signal";
import { FloodCamera } from "@/components/camera/flood-camera";
import { MapView } from "@/components/map/map-view";
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
import { Greeting } from "@/components/ui/greeting";
import { Sheet, useNarrow } from "@/components/ui/sheet";
import { Group } from "@/components/ui/surface";
import { TabBar, type Tab } from "@/components/ui/tab-bar";
import { loadGold } from "@/lib/data";
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
  const narrow = useNarrow();
  const [tab, setTab] = useState<Tab>("home");
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
    setRoute(null);
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
          <div className="px-4 py-5 text-center">
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

  const header = (
    <>
      {!narrow && <TabBar tab={tab} onChange={setTab} narrow={false} />}
      {tab === "home" ? (
        <>
          <Greeting homeLabel={profile?.home?.label.split(",")[0] ?? null} homeLetter={!searched && ok ? ok.grade.letter : null} />
          <div className="px-4 pb-2">
            <AddressSearch onPick={onPick} />
          </div>
        </>
      ) : (
        <h1 className="px-5 pb-2 pt-3 text-title font-bold">{TITLES[tab]}</h1>
      )}
    </>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
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
        focus={searched?.position ?? null}
        pins={{ home: profile?.home?.position ?? null, car: profile?.car?.position ?? null }}
        arrived={arrived}
        overlays={drainage ? DRAINAGE : []}
        route={route}
        onError={onError}
      />
      <button
        type="button"
        aria-pressed={drainage}
        onClick={() => setDrainage((d) => !d)}
        className={`material-glass pressable fixed right-3 top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 h-11 rounded-[var(--radius-control)] px-3.5 text-subhead font-medium
          ${drainage ? "text-tint" : "text-label"}`}
      >
        Drainage {drainage ? "on" : "off"}
      </button>

      <Sheet header={header} className={arrived ? "surface-arrive surface-shine" : "opacity-0"}>
        <div key={tab} id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tab-enter" aria-live="polite">
          {tab === "home" && (
            <>
              {placeState}
              {ok && <BeforePanel key={placeKey} place={ok.place} grade={ok.grade} onPick={(p) => setSearched(p)} />}
              {ok && (
                <AfterPanel
                  key={`after-${placeKey}`}
                  place={ok.place}
                  grade={ok.grade}
                  onReplay={() => {
                    controls.onScenario("milton");
                    setPump("on");
                    setHour(24);
                    setTab("live");
                  }}
                />
              )}
              <ValidationPanel />
              {searched && profile?.home && (
                <div className="px-5 pt-3">
                  <button type="button" onClick={() => setSearched(null)} className="min-h-11 text-subhead font-medium text-tint">
                    Back to your home
                  </button>
                </div>
              )}
            </>
          )}

          {tab === "live" && (
            <>
              {placeState}
              {ok ? (
                <DuringPanel key={placeKey} place={ok.place} car={profile?.car ?? null} grade={ok.grade} controls={controls} />
              ) : (
                <Group title="Storm">
                  <StormControls {...controls} />
                </Group>
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

          <p className="px-7 pt-4 text-footnote text-label-3">{SAFETY_FOOTNOTE}</p>
        </div>
      </Sheet>
      {narrow && <TabBar tab={tab} onChange={setTab} narrow />}
    </main>
  );
}
