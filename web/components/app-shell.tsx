"use client";

import { useCallback, useEffect, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { StormControls } from "@/components/map/storm-controls";
import { AddressSearch } from "@/components/report-card/address-search";
import { GradeCard } from "@/components/report-card/grade-card";
import { Group, Surface } from "@/components/ui/surface";
import { loadGold } from "@/lib/data";
import { gradeFor } from "@/lib/grade";
import type { AddressMatch, GradeResult, Hour, Manifest, PumpState, Scenario } from "@/lib/types";

// Wording from prep/04-depth-model-and-routing.md section 5.3. Shown on every card.
const SAFETY_FOOTNOTE =
  "Screening estimate from a simplified model. It leaves out storm sewers, storm surge, river flooding and groundwater, and is checked against one storm. Not a FEMA flood determination, and not for insurance, lending or purchase decisions. In a storm, follow Hillsborough County Emergency Management and the National Weather Service. Never drive or walk into floodwater.";

// ponytail: hourZeroByScenario is in the real manifest but not yet in the Manifest type (note left for Hansika).
type ManifestWithClocks = Manifest & { hourZeroByScenario?: Partial<Record<Scenario, string>> };

type CardState =
  | { kind: "empty" }
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string }
  | { kind: "result"; match: AddressMatch; grade: GradeResult };

export function AppShell() {
  const [scenario, setScenario] = useState<Scenario>("100yr");
  const [pump, setPump] = useState<PumpState>("on");
  const [hour, setHour] = useState<Hour>(14);
  const [manifest, setManifest] = useState<ManifestWithClocks | null>(null);
  const [card, setCard] = useState<CardState>({ kind: "empty" });
  const [dataError, setDataError] = useState<string | null>(null);
  const onError = useCallback((m: string) => setDataError(m), []);

  useEffect(() => {
    loadGold().then((g) => setManifest(g.manifest), (e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));
  }, [onError]);

  async function onPick(match: AddressMatch | null, error?: string) {
    if (error) return setCard({ kind: "error", message: error });
    if (!match) return setCard({ kind: "error", message: "We couldn't find that address. Try the street number and name." });
    setCard({ kind: "loading", label: match.label });
    try {
      setCard({ kind: "result", match, grade: await gradeFor(match.position) });
    } catch (e) {
      setCard({ kind: "error", message: e instanceof Error ? e.message : "The grade failed to load" });
    }
  }

  const focus = card.kind === "result" ? card.match.position : null;
  const hours = manifest?.hours ?? 48;
  const hourZero = manifest?.hourZeroByScenario?.[scenario] ?? manifest?.hourZero ?? null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView scenario={scenario} pump={pump} hour={Math.min(hour, hours - 1)} focus={focus} onError={onError} />
      <Surface>
        <div className="px-4 pt-3 md:pt-1">
          <h1 className="px-1 text-title font-bold">Fludd</h1>
          <AddressSearch onPick={onPick} />
        </div>

        {dataError && (
          <Group>
            <p role="alert" className="px-4 py-3 text-subhead text-late">{dataError}</p>
          </Group>
        )}

        <div aria-live="polite">
          {card.kind === "empty" && (
            <Group>
              <div className="px-4 py-5 text-center">
                <p className="text-headline font-semibold">No address yet</p>
                <p className="mt-1 text-subhead text-label-2">
                  Search for one to see its flood grade, where the water goes and when to move your car.
                </p>
              </div>
            </Group>
          )}
          {card.kind === "loading" && (
            <Group>
              <p className="px-4 py-5 text-center text-subhead text-label-2">Grading {card.label}…</p>
            </Group>
          )}
          {card.kind === "error" && (
            <Group>
              <p role="alert" className="px-4 py-4 text-subhead">{card.message}</p>
            </Group>
          )}
          {card.kind === "result" && card.grade.kind === "outside" && (
            <Group>
              <div className="px-4 py-4">
                <p className="text-headline font-semibold">Outside the validated area</p>
                <p className="mt-1 text-subhead text-label-2">
                  {card.match.label} is outside the area around USF that the model covers, so it gets no grade.
                </p>
              </div>
            </Group>
          )}
          {card.kind === "result" && card.grade.kind === "ok" && <GradeCard label={card.match.label} grade={card.grade} />}
        </div>

        <Group title="Storm">
          <StormControls
            scenario={scenario}
            pump={pump}
            hour={Math.min(hour, hours - 1)}
            hours={hours}
            hourZero={hourZero}
            onScenario={setScenario}
            onPump={setPump}
            onHour={setHour}
          />
        </Group>

        <p className="px-7 pt-3 text-footnote text-label-3">{SAFETY_FOOTNOTE}</p>
      </Surface>
    </main>
  );
}
