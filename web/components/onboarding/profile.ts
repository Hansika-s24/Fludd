"use client";

import { useSyncExternalStore } from "react";
import type { LngLat } from "@/lib/types";

/**
 * What onboarding collects. Kept on this device only (localStorage): a home address and a parking spot
 * are sensitive, so they are never sent to our server or stored in Supabase.
 */
export type DriveHabit = "daily" | "weekly" | "rarely" | "no_car";
/** What they drive, as the road model's vehicle classes: a car stalls in about 6 in of water, an SUV or pickup in about 12 in. */
export type Vehicle = "car" | "suv";
export type Tenure = "own" | "rent";
export type HomeType = "house" | "apartment" | "condo" | "townhouse" | "mobile_home";
export type FloodCover = "nfip" | "private" | "none" | "unsure";

export interface Housing {
  tenure: Tenure | null;
  type: HomeType | null;
  /** which floor they live on (1 = ground); asked only for apartments and condos */
  floor: number | null;
}
export interface Insurance {
  flood: FloodCover | null;
  /** renters (contents) insurance; asked only when renting */
  contents: boolean | null;
  /** optional free text, kept on this device so it is at hand on a flood day */
  carrier: string;
  policyNumber: string;
  renewal: string;
}
export interface Camera {
  optIn: boolean;
  snapshotUrl: string;
}

export interface Profile {
  home: { label: string; position: LngLat } | null;
  car: { label: string; position: LngLat } | null;
  drives: DriveHabit | null;
  vehicle: Vehicle | null;
  housing: Housing;
  insurance: Insurance;
  camera: Camera;
  /** true once onboarding was finished or skipped */
  done: boolean;
}

const KEY = "fludd-profile-v1";
export const EMPTY_PROFILE: Profile = {
  home: null,
  car: null,
  drives: null,
  vehicle: null,
  housing: { tenure: null, type: null, floor: null },
  insurance: { flood: null, contents: null, carrier: "", policyNumber: "", renewal: "" },
  camera: { optIn: false, snapshotUrl: "" },
  done: false,
};
const EMPTY = EMPTY_PROFILE;

/** Fill in defaults, including nested groups, so profiles saved before a field existed still read whole. */
export function withDefaults(saved: Partial<Profile>): Profile {
  return {
    ...EMPTY,
    ...saved,
    housing: { ...EMPTY.housing, ...saved.housing },
    insurance: { ...EMPTY.insurance, ...saved.insurance },
    camera: { ...EMPTY.camera, ...saved.camera },
  };
}
const listeners = new Set<() => void>();
let cache: Profile | null = null;

function read(): Profile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? withDefaults(JSON.parse(raw) as Partial<Profile>) : EMPTY;
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
