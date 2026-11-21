"use client";

import { useSyncExternalStore } from "react";
import type { LngLat } from "@/lib/types";

/**
 * Ways a person helped their neighbourhood, kept on this device only (localStorage).
 * Points are for fun: they never reach the server and never touch anyone's grade.
 * A contribution that happened somewhere keeps that place, so the Rewards tab can count the homes near it.
 */
export type ContributionKind = "report" | "camera" | "inlet" | "checkin" | "prepared" | "onboarded";

export interface Contribution {
  kind: ContributionKind;
  /** ISO timestamp */
  at: string;
  /** Where it happened, when it happened somewhere: a report's position, a flood camera's home. Device-only. */
  position?: LngLat;
}

export const POINTS: Record<ContributionKind, number> = {
  report: 20,
  camera: 40,
  inlet: 10,
  checkin: 10,
  prepared: 15,
  onboarded: 5,
};

type Rule = "always" | "daily" | "once";
const RULES: Record<ContributionKind, Rule> = {
  report: "always",
  camera: "once",
  inlet: "daily",
  checkin: "daily",
  prepared: "once",
  onboarded: "once",
};

export const RANKS = [
  { name: "Puddle Spotter", min: 0 },
  { name: "Rain Watcher", min: 25 },
  { name: "Storm Scout", min: 75 },
  { name: "Pelican", min: 150 },
  { name: "Harbor Keeper", min: 300 },
] as const;

export interface Rank {
  name: string;
  min: number;
  next: { name: string; min: number } | null;
  /** 0..1 through the current rank toward the next */
  progress: number;
}

export function rankFor(points: number): Rank {
  let i = 0;
  while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
  const here = RANKS[i];
  const next = i + 1 < RANKS.length ? RANKS[i + 1] : null;
  const progress = next ? Math.min(1, Math.max(0, (points - here.min) / (next.min - here.min))) : 1;
  return { name: here.name, min: here.min, next: next ? { name: next.name, min: next.min } : null, progress };
}

export function totalPoints(list: readonly Contribution[]): number {
  return list.reduce((sum, c) => sum + POINTS[c.kind], 0);
}

/** Local calendar day, so "once per day" resets at the person's midnight. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Why a kind can't be recorded now, or null when it can. */
export function blockedReason(list: readonly Contribution[], kind: ContributionKind, now: Date): "today" | "once" | null {
  const rule = RULES[kind];
  if (rule === "always") return null;
  const same = list.filter((c) => c.kind === kind);
  if (rule === "once") return same.length > 0 ? "once" : null;
  const today = dayKey(now);
  return same.some((c) => dayKey(new Date(c.at)) === today) ? "today" : null;
}

export function addContribution(
  list: readonly Contribution[],
  kind: ContributionKind,
  now: Date,
  position?: LngLat | null,
): { list: Contribution[]; added: boolean; points: number } {
  if (blockedReason(list, kind, now)) return { list: [...list], added: false, points: 0 };
  const entry: Contribution = { kind, at: now.toISOString() };
  if (position) entry.position = [position[0], position[1]];
  return { list: [...list, entry], added: true, points: POINTS[kind] };
}

const KEY = "fludd-contributions-v1";
const EMPTY: Contribution[] = [];
const listeners = new Set<() => void>();
let cache: Contribution[] | null = null;

function isLngLat(x: unknown): x is LngLat {
  return (
    Array.isArray(x) && x.length === 2 &&
    typeof x[0] === "number" && typeof x[1] === "number" &&
    Math.abs(x[0]) <= 180 && Math.abs(x[1]) <= 90
  );
}

/** What was saved, read back safely: unknown kinds are dropped, a broken place is dropped but its record kept. */
export function parseStored(value: unknown): Contribution[] {
  if (!Array.isArray(value)) return [];
  const list: Contribution[] = [];
  for (const x of value as unknown[]) {
    if (typeof x !== "object" || x === null) continue;
    const c = x as { kind?: unknown; at?: unknown; position?: unknown };
    if (typeof c.kind !== "string" || !(c.kind in POINTS) || typeof c.at !== "string") continue;
    const entry: Contribution = { kind: c.kind as ContributionKind, at: c.at };
    if (isLngLat(c.position)) entry.position = [c.position[0], c.position[1]];
    list.push(entry);
  }
  return list;
}

function read(): Contribution[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? parseStored(JSON.parse(raw) as unknown) : EMPTY;
  } catch {
    cache = EMPTY; // storage blocked: points live in memory for this visit
  }
  return cache;
}

/** `position` is where it happened, for the kinds that happen somewhere; leave it out otherwise. */
export function recordContribution(
  kind: ContributionKind,
  position?: LngLat | null,
  now: Date = new Date(),
): { added: boolean; points: number } {
  const result = addContribution(read(), kind, now, position);
  if (!result.added) return { added: false, points: 0 };
  cache = result.list;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // keep it in memory for this visit
  }
  for (const l of listeners) l();
  return { added: true, points: result.points };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** null during the server render. */
export function useContributions(): Contribution[] | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
