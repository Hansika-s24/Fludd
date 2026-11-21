"use client";

import { useSyncExternalStore } from "react";
import type { LngLat } from "@/lib/types";

/**
 * What onboarding collects. Kept on this device only (localStorage): a home address and a parking spot
 * are sensitive, so they are never sent to our server or stored in Supabase.
 */
export type DriveHabit = "daily" | "weekly" | "rarely" | "no_car";
export interface Profile {
  home: { label: string; position: LngLat } | null;
  car: { label: string; position: LngLat } | null;
  drives: DriveHabit | null;
  /** true once onboarding was finished or skipped */
  done: boolean;
}

const KEY = "fludd-profile-v1";
const EMPTY: Profile = { home: null, car: null, drives: null, done: false };
const listeners = new Set<() => void>();
let cache: Profile | null = null;

function read(): Profile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Profile>) } : EMPTY;
  } catch {
    cache = EMPTY; // storage blocked (private mode): onboarding simply runs again next visit
  }
  return cache;
}

export function saveProfile(patch: Partial<Profile>): void {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // keep it in memory for this visit
  }
  for (const l of listeners) l();
}

export function forgetProfile(): void {
  cache = EMPTY;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** null during the server render, so nothing personal is ever rendered on the server. */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** The phone's position, once. Rejects with a sentence a person can act on. */
export function currentPosition(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This browser can't share its location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location is off for this site. Allow it in your browser settings, or use your home address instead."
              : "We couldn't get your location. Try again outside or near a window.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
