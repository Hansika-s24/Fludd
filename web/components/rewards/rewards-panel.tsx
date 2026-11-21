"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Group } from "@/components/ui/surface";
import { Icon } from "@/components/stages/shared";
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

/* The last rank this device has seen, so a rank-up celebrates exactly once. */
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
.rw-card { position: relative; overflow: hidden; }
.rw-celebrate { animation: rw-pop 600ms var(--ease-spring) both; }
.rw-celebrate::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 30%, oklch(1 0 0 / 0.75) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: rw-shimmer 1100ms 150ms ease-in-out both;
}
.rw-line { animation: rw-fade 300ms ease-out both; }
.rw-tick { position: absolute; right: 0.25rem; top: -0.25rem; pointer-events: none; animation: rw-float 600ms ease-out forwards; }
.rw-bar { transition: width 500ms var(--ease-spring); }
@keyframes rw-pop { from { transform: scale(0.96); } to { transform: none; } }
@keyframes rw-shimmer { to { transform: translateX(100%); } }
@keyframes rw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rw-float { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-12px); } }
@media (prefers-reduced-motion: reduce) {
  .rw-celebrate { animation: rw-fade 300ms ease-out both; }
  .rw-celebrate::after { display: none; }
  .rw-tick { display: none; }
  .rw-bar { transition: none; }
}
`;

function RankCard({ list }: { list: Contribution[] }) {
  const points = totalPoints(list);
  const rank = rankFor(points);
  const index = rankIndex(rank.name);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => null);
  const celebrating = seen !== null && index > seen;

  useEffect(() => {
    if (seen === null) {
      saveSeen(index); // first visit: remember quietly, nothing to celebrate yet
    } else if (index < seen) {
      saveSeen(index);
    } else if (celebrating) {
      const t = setTimeout(() => saveSeen(index), CELEBRATION_MS);
      return () => clearTimeout(t);
    }
  }, [seen, index, celebrating]);

  return (
    <section className="px-4 pt-4">
      <div
        key={celebrating ? `up-${index}` : "card"}
        className={`rw-card rounded-[var(--radius-group)] bg-group px-4 pt-4 pb-4 ${celebrating ? "rw-celebrate" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-footnote font-medium uppercase text-label-2">Your rank</p>
            <p className="mt-1 text-title font-semibold">{rank.name}</p>
            <p className="mt-1 text-subhead text-label-2">
              <span className="font-semibold text-label tabular-nums">{points}</span> {points === 1 ? "point" : "points"}
            </p>
          </div>
          <span className="text-tint">
            <Pelican />
          </span>
        </div>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full bg-fill"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(rank.progress * 100)}
          aria-label={rank.next ? `Progress to ${rank.next.name}` : "Top rank reached"}
        >
          <div className="rw-bar h-full rounded-full bg-tint" style={{ width: `${rank.progress * 100}%` }} />
        </div>
        <p className="mt-2 text-footnote text-label-2">
          {rank.next ? `${rank.next.min - points} points to ${rank.next.name}` : "You have reached the top rank."}
        </p>
        <p aria-live="polite" className="text-subhead font-medium text-tint">
          {celebrating && <span className="rw-line mt-2 block">{`You're now a ${rank.name}.`}</span>}
        </p>
      </div>
    </section>
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

function WayRow({ way, list, now, last }: { way: Way; list: Contribution[]; now: number; last: boolean }) {
  const [tick, setTick] = useState<number | null>(null);
  const points = POINTS[way.kind];
  const blocked = blockedReason(list, way.kind, new Date(now));
  const done = list.some((c) => c.kind === way.kind);

  function record() {
    const r = recordContribution(way.kind);
    if (r.added) setTick(Date.now());
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-separator"}`}>
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

/** Ranks and points for helping the neighbourhood during floods. Device-only, never shown to anyone else. */
export function RewardsPanel() {
  const list = useContributions();
  const now = useNow();
  if (!list) return <div className="min-h-40" aria-busy />;
  const recent = [...list].reverse().slice(0, 8);
  // `now` refreshes every 30 s; a row tapped just now must count as today straight away.
  const ruleNow = Math.max(now, list.length ? Date.parse(list[list.length - 1].at) : 0);

  return (
    <div className="pb-4">
      <style>{STYLES}</style>
      <RankCard list={list} />
      <Group title="Ways to help">
        {WAYS.map((w, i) => (
          <WayRow key={w.kind} way={w} list={list} now={ruleNow} last={i === WAYS.length - 1} />
        ))}
      </Group>
      <Group title="Your history">
        {recent.length === 0 ? (
          <p className="px-4 py-3 text-subhead text-label-2">Nothing yet. Each way to help above adds to your rank.</p>
        ) : (
          <ul>
            {recent.map((c, i) => (
              <li key={`${c.at}-${c.kind}`} className={`flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 ${i === recent.length - 1 ? "" : "border-b border-separator"}`}>
                <div className="min-w-0">
                  <p className="text-subhead">{LABELS[c.kind]}</p>
                  <p className="text-footnote text-label-2">{relativeTime(c.at, Math.max(now, ruleNow))}</p>
                </div>
                <span className="shrink-0 text-subhead font-semibold tabular-nums text-label-2">+{POINTS[c.kind]}</span>
              </li>
            ))}
          </ul>
        )}
      </Group>
      <p className="px-7 pt-3 text-footnote text-label-2">
        Points stay on this device. Ranks are for fun and do not affect anyone&apos;s grade.
      </p>
    </div>
  );
}
