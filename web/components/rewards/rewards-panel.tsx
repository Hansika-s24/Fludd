"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Group } from "@/components/ui/surface";
import { Icon } from "@/components/stages/shared";
import { loadParcels } from "@/lib/data";
import type { LngLat } from "@/lib/types";
import {
  POINTS,
  RANKS,
  blockedReason,
  rankFor,
  recordContribution,
  totalPoints,
  useContributions,
  type Contribution,
  type ContributionKind,
} from "./contributions";
import {
  REACH_BOX,
  REACH_CAP,
  REACH_RADIUS_M,
  approvedPlaces,
  countHomes,
  homesFrom,
  impactOf,
  placesOf,
  reachSlots,
  type Home,
  type Impact,
} from "./impact";

/* The last level this device has seen, so moving up a level is marked exactly once. */
const SEEN_KEY = "fludd-rank-seen-v1";
const seenListeners = new Set<() => void>();
let seenCache: number | null | undefined;

function readSeen(): number | null {
  if (seenCache !== undefined) return seenCache;
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    seenCache = raw === null ? null : Number(raw);
  } catch {
    seenCache = null;
  }
  return seenCache;
}
function saveSeen(index: number): void {
  seenCache = index;
  try {
    localStorage.setItem(SEEN_KEY, String(index));
  } catch {
    // memory only
  }
  for (const l of seenListeners) l();
}
const subscribeSeen = (l: () => void) => {
  seenListeners.add(l);
  return () => seenListeners.delete(l);
};

const CELEBRATION_MS = 4000;

export function rankIndex(name: string): number {
  return RANKS.findIndex((r) => r.name === name);
}

/** "just now", "5 min ago", "2 h ago", "3 d ago". */
export function relativeTime(iso: string, now: number): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

const count = (n: number) => n.toLocaleString("en-US");
/** Place in a staggered entrance, read by the motion kit classes. Always set, so nothing inherits a parent's place. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const LABELS: Record<ContributionKind, string> = {
  report: "Sent a flood photo",
  camera: "Shared a camera during storms",
  inlet: "Cleared a blocked inlet",
  checkin: "Checked on a neighbour",
  prepared: "Got ready before a storm",
  onboarded: "Set up home",
};

function Pelican({ size = 44 }: { size?: number }) {
  // A pelican in profile: round head, long bill with its pouch, body resting on water.
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="17" cy="12" r="5" />
      <path d="M21.5 10.5 40 14l-18 2.5" />
      <path d="M22 16.5c4 3 10 2 14-1" />
      <path d="M14 16.5c-1 4-1 7 1 10" />
      <path d="M15 26.5c-5 0-8 3-8 7h22c5 0 9-3 11-7-6 1-11 0-15-2" />
      <circle cx="16.5" cy="11.5" r="0.6" fill="currentColor" />
      <path d="M5 39c3 1.5 5 1.5 8 0s5-1.5 8 0 5 1.5 8 0 5-1.5 8 0 5 1.5 6 .5" />
    </svg>
  );
}

const STYLES = `
.rw-celebrate { animation: rw-pop 600ms var(--ease-spring) both; }
.rw-line { animation: rw-fade 300ms ease-out both; }
.rw-tick { position: absolute; right: 0.25rem; top: -0.25rem; pointer-events: none; animation: rw-float 600ms ease-out forwards; }
.rw-bar { transition: transform 500ms var(--ease-spring); }
.rw-home { transform-box: fill-box; transform-origin: center; }
@keyframes rw-pop { from { transform: scale(0.96); } to { transform: none; } }
@keyframes rw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rw-float { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-12px); } }
@media (prefers-reduced-motion: reduce) {
  .rw-celebrate { animation: rw-fade 300ms ease-out both; }
  .rw-tick { display: none; }
  .rw-bar { transition: none; }
}
`;

/* ---------- real data: county homes, and the approved report feed ---------- */

type HomesState = Home[] | "loading" | "unavailable";

/** Homes from the county parcel file, loaded only once there is a place to count around. */
function useHomes(needed: boolean): HomesState {
  const [state, setState] = useState<Home[] | "unavailable" | null>(null);
  useEffect(() => {
    if (!needed) return;
    let stale = false;
    loadParcels().then(
      (parcels) => {
        if (!stale) setState(homesFrom(parcels));
      },
      () => {
        if (!stale) setState("unavailable");
      },
    );
    return () => {
      stale = true;
    };
  }, [needed]);
  return state ?? "loading";
}

/** Street-level positions of approved reports; null while loading, on an error, or when reports are not set up. */
function useApprovedPlaces(): LngLat[] | null {
  const [places, setPlaces] = useState<LngLat[] | null>(null);
  useEffect(() => {
    let stale = false;
    fetch("/api/reports?status=approved")
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((body) => {
        if (!stale) setPlaces(approvedPlaces(body));
      })
      .catch(() => undefined); // offline: the community line simply stays hidden
    return () => {
      stale = true;
    };
  }, []);
  return places;
}

/* ---------- the headline: one person, many homes ---------- */

/* The last house starts landing by RING_SPREAD_MS; with the kit's 420 ms landing the whole ring is in by about 900 ms. */
const RING_SPREAD_MS = 480;
const HOUSE_GAP_MS = 45;

/** One person in the centre; each filled house around them is one counted home, nearest ring first. */
function ReachPicture({ homes }: { homes: number }) {
  const shown = Math.min(homes, REACH_CAP);
  const gap = Math.min(HOUSE_GAP_MS, RING_SPREAD_MS / Math.max(1, shown - 1));
  const mid = REACH_BOX / 2;
  const label =
    homes === 0
      ? "One person in the centre, with the homes a report can reach around them"
      : `You in the centre with ${count(shown)} ${plural(shown, "home", "homes")} around you${homes > REACH_CAP ? `, out of ${count(homes)} counted` : ""}`;
  return (
    <svg
      viewBox={`0 0 ${REACH_BOX} ${REACH_BOX}`}
      role="img"
      aria-label={label}
      className="mx-auto mt-4 block w-full max-w-[184px]"
      style={{ "--stagger": `${gap}ms` } as CSSProperties}
    >
      {reachSlots(homes).map((slot, i) => (
        <g key={i} transform={`translate(${slot.x} ${slot.y})`}>
          <path
            d="M0-4.8 5-.6V4.4H-5V-.6Z"
            className={slot.filled ? "rw-home pop-in fill-tint" : "fill-label-3/25"}
            style={slot.filled ? at(i) : undefined}
          />
        </g>
      ))}
      <circle cx={mid} cy={mid} r="13" className="fill-tint" />
      <circle cx={mid} cy={mid - 4} r="3.6" fill="white" />
      <path d={`M${mid - 7} ${mid + 7.5}a7 6 0 0 1 14 0Z`} fill="white" />
    </svg>
  );
}

/**
 * The homes figure, counting up from zero when it arrives. The real figure stays in the page, unseen, so it
 * holds the width and is what a screen reader hears; the counting digits sit over it. CountUp prints no
 * thousands separator, so a count of 1,000 or more is shown whole instead of counted.
 */
function HomesCount({ homes }: { homes: number }) {
  const [armed, setArmed] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const raf = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  if (homes >= 1000) return <span className="text-grade font-bold tabular-nums">{count(homes)}</span>;
  return (
    <span className="relative inline-block text-grade font-bold tabular-nums">
      <span className="opacity-0">{count(homes)}</span>
      <span className="absolute inset-0" aria-hidden>
        <CountUp value={armed ? homes : 0} />
      </span>
    </span>
  );
}

const BLOCK = `${REACH_RADIUS_M} m, about one street block,`;
const SEEN = "Once a person has checked a report, the people living there can see it on the map before they drive into the water.";

function ImpactCard({ impact, uncounted }: { impact: Impact; uncounted: number }) {
  const where = impact.kind === "invite" ? "" : plural(impact.places, "the place", `the ${count(impact.places)} places`);
  // The card rises in once. When its message changes later (counting, then the count) the new one swaps in.
  const [firstKind] = useState(impact.kind);
  const swap = impact.kind === firstKind ? undefined : "swap-in";
  return (
    <section className="rise-in px-4 pt-4" style={at(0)} aria-labelledby="rw-impact">
      <div className="rounded-[var(--radius-group)] bg-group px-4 pt-4 pb-4">
        <p className="text-footnote font-medium uppercase text-label-2">Your reach</p>
        {impact.kind === "homes" ? (
          <div key="homes" className={swap}>
            <h2 id="rw-impact" className="mt-1">
              <span className="block text-subhead text-label-2">You&apos;ve helped about</span>
              <span className="mt-1 block">
                <HomesCount homes={impact.homes} />{" "}
                <span className="text-title font-semibold">{plural(impact.homes, "home", "homes")}</span>
              </span>
            </h2>
            <p className="mt-2 text-subhead text-label-2">
              Homes within {BLOCK} of {where} you reported from. {SEEN}
            </p>
          </div>
        ) : impact.kind === "counting" ? (
          <div key="counting" className={swap}>
            <h2 id="rw-impact" className="mt-1 text-title font-semibold">
              Counting the homes near you
            </h2>
            <p className="mt-2 text-subhead text-label-2" role="status">
              Reading county parcel records for homes within {BLOCK} of {where} you reported from.
            </p>
          </div>
        ) : impact.kind === "places" ? (
          <div key="places" className={swap}>
            <h2 id="rw-impact" className="mt-1 text-title font-semibold">
              You reported from {count(impact.places)} {plural(impact.places, "place", "places")}
            </h2>
            <p className="mt-2 text-subhead text-label-2">
              {impact.why === "no-records"
                ? "The county parcel records did not load, so the homes nearby cannot be counted right now. Your reports still stand."
                : `The county parcel records show no homes within ${REACH_RADIUS_M} m of ${plural(impact.places, "it", "them")}. Once a person has checked a report, anyone opening the map nearby still sees it.`}
            </p>
          </div>
        ) : (
          <div key="invite" className={swap}>
            <h2 id="rw-impact" className="mt-1 text-title font-semibold">
              One report reaches a whole block
            </h2>
            <p className="mt-2 text-subhead text-label-2">
              Send a photo of flooding from Home, under Report what you saw. Fludd then counts the real homes within{" "}
              {BLOCK} of it, from county parcel records. {SEEN}
            </p>
          </div>
        )}
        {impact.kind !== "places" && <ReachPicture homes={impact.kind === "homes" ? impact.homes : 0} />}
        {impact.kind === "homes" && (
          <p className="rise-in mt-3 text-center text-footnote text-label-2" style={at(0)}>
            {impact.homes > REACH_CAP
              ? `You are in the centre. The picture holds ${REACH_CAP} houses; the number above is the full count.`
              : "You are in the centre. Each filled house is one home."}
          </p>
        )}
        {uncounted > 0 && (
          <p className="mt-3 text-footnote text-label-2">
            {count(uncounted)} earlier {plural(uncounted, "report was", "reports were")} saved without a place, so{" "}
            {plural(uncounted, "it is", "they are")} not in this count.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- levels and points: kept, but under the headline and smaller ---------- */

function LevelRow({ list }: { list: Contribution[] }) {
  const points = totalPoints(list);
  const rank = rankFor(points);
  const index = rankIndex(rank.name);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => null);
  const celebrating = seen !== null && index > seen;

  useEffect(() => {
    if (seen === null) {
      saveSeen(index); // first visit: remember quietly, nothing to mark yet
    } else if (index < seen) {
      saveSeen(index);
    } else if (celebrating) {
      const t = setTimeout(() => saveSeen(index), CELEBRATION_MS);
      return () => clearTimeout(t);
    }
  }, [seen, index, celebrating]);

  return (
    <Group title="Your contribution level">
      {/* Keyed by level: a new level remounts the row, so the celebration and the bar fill play once, at the moment it is reached. */}
      <div className="rise-in" style={at(1)}>
        <div key={index} className={`px-4 py-3 ${celebrating ? "rw-celebrate" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-tint">
              <Pelican size={30} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-headline font-semibold">{rank.name}</p>
              <p className="text-footnote text-label-2">
                <CountUp value={points} /> {plural(points, "point", "points")}
                {rank.next ? `, ${rank.next.min - points} more to ${rank.next.name}` : ", the highest level"}
              </p>
            </div>
          </div>
          <div
            className="mt-3 h-1 overflow-hidden rounded-full bg-fill"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(rank.progress * 100)}
            aria-label={rank.next ? `Progress to ${rank.next.name}` : "Highest level reached"}
          >
            {/* The wrapper fills once on arrival; the bar inside slides to each later value. Both move by transform only. */}
            <div className="grow-x h-full" style={at(3)}>
              <div
                className="rw-bar h-full w-full rounded-full bg-tint"
                style={{ transform: `translateX(${(rank.progress - 1) * 100}%)` }}
              />
            </div>
          </div>
          <p aria-live="polite" className="text-footnote font-medium text-tint">
            {celebrating && <span className="rw-line mt-2 block">{`You're now a ${rank.name}.`}</span>}
          </p>
        </div>
      </div>
    </Group>
  );
}

interface Way {
  kind: ContributionKind;
  label: string;
  icon: ReactNode;
  /** recordable here with a button; otherwise a sentence saying where it happens */
  action: true | string;
  rule: string;
}

const iconCls = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const WAYS: Way[] = [
  {
    kind: "report",
    label: "Report flooding",
    icon: (
      <svg {...iconCls}>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
    action: "Send a photo from Home, under Report what you saw",
    rule: "each photo",
  },
  {
    kind: "inlet",
    label: "I cleared a blocked inlet",
    icon: (
      <svg {...iconCls}>
        <path d="M4 15h16M6 15v4M10 15v4M14 15v4M18 15v4M8 11l4-6 4 6" />
      </svg>
    ),
    action: true,
    rule: "once a day",
  },
  {
    kind: "checkin",
    label: "I checked on a neighbour",
    icon: Icon.home,
    action: true,
    rule: "once a day",
  },
  {
    kind: "camera",
    label: "Share your camera during storms",
    icon: (
      <svg {...iconCls}>
        <path d="M3 7h12v10H3zM15 10l6-3v10l-6-3" />
      </svg>
    ),
    action: "Turn on camera sharing when you set up home",
    rule: "once",
  },
  {
    kind: "prepared",
    label: "Get ready before a storm",
    icon: (
      <svg {...iconCls}>
        <path d="M9 5h10M9 12h10M9 19h10M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2" />
      </svg>
    ),
    action: true,
    rule: "once",
  },
];

function WayRow({ way, list, now, last, order }: { way: Way; list: Contribution[]; now: number; last: boolean; order: number }) {
  const [tick, setTick] = useState<number | null>(null);
  const points = POINTS[way.kind];
  const blocked = blockedReason(list, way.kind, new Date(now));
  const done = list.some((c) => c.kind === way.kind);

  function record() {
    const r = recordContribution(way.kind);
    if (r.added) setTick(Date.now());
  }

  return (
    <div className={`rise-in flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-separator"}`} style={at(order)}>
      <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-tint text-white" aria-hidden>
        {way.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body">{way.label}</p>
        <p className="text-footnote text-label-2">
          {typeof way.action === "string" ? way.action : `${points} points, ${way.rule}`}
        </p>
      </div>
      {way.action === true ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={record}
            disabled={blocked !== null}
            className="pressable min-h-11 min-w-[5.5rem] rounded-full bg-fill px-4 text-subhead font-semibold text-tint disabled:font-medium disabled:text-label-2"
          >
            {blocked === "today" ? "Done today" : blocked === "once" ? "Done" : `+${points}`}
          </button>
          {tick !== null && (
            <span key={tick} className="rw-tick text-footnote font-semibold text-tint tabular-nums" aria-hidden onAnimationEnd={() => setTick(null)}>
              +{points}
            </span>
          )}
        </div>
      ) : (
        <span className={`shrink-0 text-subhead tabular-nums ${done ? "text-label-2" : "font-semibold text-tint"}`}>
          {way.kind === "camera" && done ? "Done" : `+${points}`}
        </span>
      )}
    </div>
  );
}

/* A clock that ticks every 30 s, read outside render so server output stays stable. */
let nowCache = 0;
const readNow = () => (nowCache ||= Date.now());
const subscribeNow = (l: () => void) => {
  const t = setInterval(() => {
    nowCache = Date.now();
    l();
  }, 30_000);
  return () => clearInterval(t);
};
function useNow(): number {
  return useSyncExternalStore(subscribeNow, readNow, () => 0);
}

/**
 * How one person's contributions reach the homes around them, with levels and points underneath.
 * Contributions stay on this device. The only things fetched are the county parcel file and the public feed
 * of approved reports; nothing about this person is sent.
 */
export function RewardsPanel() {
  const list = useContributions();
  const now = useNow();
  const places = useMemo(() => placesOf(list ?? []), [list]);
  const community = useApprovedPlaces();
  const homes = useHomes(places.length > 0 || (community !== null && community.length > 0));
  const helped = useMemo(() => (typeof homes === "string" ? homes : countHomes(places, homes)), [places, homes]);
  const communityHomes = useMemo(
    () => (community && community.length > 0 && typeof homes !== "string" ? countHomes(community, homes) : null),
    [community, homes],
  );
  const recent = useMemo(() => [...(list ?? [])].reverse().slice(0, 8), [list]);
  /** Homes each recent contribution reaches on its own; null with no place or before the records load. */
  const recentHomes = useMemo(
    () => recent.map((c) => (c.position && typeof homes !== "string" ? countHomes([c.position], homes) : null)),
    [recent, homes],
  );

  if (!list) return <div className="min-h-40" aria-busy />;
  // `now` refreshes every 30 s; a row tapped just now must count as today straight away.
  const ruleNow = Math.max(now, list.length ? Date.parse(list[list.length - 1].at) : 0);
  const uncounted = list.filter((c) => (c.kind === "report" || c.kind === "camera") && !c.position).length;

  return (
    <div className="pb-4">
      <style>{STYLES}</style>
      <ImpactCard impact={impactOf(places.length, helped)} uncounted={uncounted} />
      {community && communityHomes !== null && (
        <p className="rise-in px-7 pt-2 text-footnote text-label-2" style={at(0)}>
          Neighbours here have sent {count(community.length)} approved {plural(community.length, "report", "reports")}
          {communityHomes > 0 ? ` covering about ${count(communityHomes)} ${plural(communityHomes, "home", "homes")}` : ""}
          . That includes any of yours a person has checked.
        </p>
      )}
      <LevelRow list={list} />
      <Group title="Ways to help">
        {WAYS.map((w, i) => (
          <WayRow key={w.kind} way={w} list={list} now={ruleNow} last={i === WAYS.length - 1} order={i + 2} />
        ))}
      </Group>
      <Group title="What you have done">
        {recent.length === 0 ? (
          <p className="rise-in px-4 py-3 text-subhead text-label-2" style={at(7)}>Nothing yet. Anything you do from the list above shows here.</p>
        ) : (
          <ul>
            {recent.map((c, i) => {
              const near = recentHomes[i];
              return (
                <li
                  key={`${c.at}-${c.kind}`}
                  className={`rise-in flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 ${i === recent.length - 1 ? "" : "border-b border-separator"}`}
                  style={at(i)}
                >
                  <div className="min-w-0">
                    <p className="text-subhead">{LABELS[c.kind]}</p>
                    <p className="text-footnote text-label-2">
                      {relativeTime(c.at, ruleNow)}
                      {near ? `, about ${count(near)} ${plural(near, "home", "homes")} within ${REACH_RADIUS_M} m` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-footnote tabular-nums text-label-2">+{POINTS[c.kind]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Group>
      <p className="rise-in px-7 pt-3 text-footnote text-label-2" style={at(8)}>
        Your contributions and their places stay on this device. Home counts come from county parcel records: one
        parcel is one home, vacant lots are left out, and a home near two of your reports counts once. Levels and
        points are for fun and do not affect anyone&apos;s grade.
      </p>
    </div>
  );
}
