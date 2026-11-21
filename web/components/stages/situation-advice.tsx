"use client";

import type { ReactNode } from "react";
import { Group } from "@/components/ui/surface";
import type { Profile } from "@/components/onboarding/profile";
import { Icon, ListRow } from "./shared";

type Letter = "A" | "B" | "C" | "D" | "F";

export interface Advice {
  id: string;
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
}

/**
 * 2 to 4 fact-only recommendations from what onboarding saved. Deterministic: same profile and letter, same list.
 * The only numbers are the NFIP residential limits and its usual 30-day waiting period. Never calls a place safe.
 */
export function adviceFor(profile: Profile, letter: Letter): Advice[] {
  const { tenure, type, floor } = profile.housing;
  const { flood, contents } = profile.insurance;
  const stacked = type === "apartment" || type === "condo";
  const upstairs = stacked && floor !== null && floor >= 2;
  const noCar = profile.drives === "no_car";
  const weakGrade = letter === "C" || letter === "D" || letter === "F";
  const out: Advice[] = [];

  const car: Advice = {
    id: "car",
    icon: Icon.car,
    label: "Your car",
    title: "Move the car early",
    detail: "Your unit is above the ground floor, but the parking lot is not. Move the car to higher ground when Fludd says to.",
  };
  const exit: Advice = {
    id: "exit",
    icon: Icon.door,
    label: "Getting out",
    title: "Know your way out",
    detail: "Find the stairwell and exit you would use if the ground floor and lot flood, and keep a go-bag by the door.",
  };
  const belongings: Advice = {
    id: "contents",
    icon: Icon.home,
    label: "Your belongings",
    title: contents ? "Check your renters policy for flood" : "Insure your belongings",
    detail: contents
      ? "Renters insurance covers your belongings, but most policies leave out flood. Ask whether yours does."
      : "Renters (contents) insurance covers what you own. The building itself is your landlord's to insure.",
  };

  if (tenure === "rent" && upstairs) {
    out.push(
      { ...belongings, detail: `${belongings.detail} You live above the ground floor, so raising the floor is not on you.` },
      ...(noCar ? [] : [car]),
      exit,
    );
  } else if (tenure === "rent") {
    out.push(
      belongings,
      { id: "up", icon: Icon.home, label: "Inside", title: "Move valuables up", detail: "Keep documents, electronics and anything you can't replace on high shelves or upstairs." },
      { id: "landlord", icon: Icon.wrench, label: "Your landlord", title: "Ask about vents and valves", detail: "Ask whether the building has flood vents and a backflow valve on the sewer line." },
    );
  } else if (tenure === "own" && upstairs) {
    out.push(
      { id: "unit", icon: Icon.home, label: "Your unit", title: "Insure what is yours", detail: "The association insures the building. Your belongings and the improvements inside your unit need your own cover." },
      ...(noCar ? [] : [car]),
      exit,
    );
  } else if (tenure === "own") {
    out.push(
      { id: "utilities", icon: Icon.wrench, label: "Your home", title: "Raise utilities", detail: "Raise the water heater, AC unit and electrical panel above the expected water level. If you renovate, consider raising the lowest floor." },
      { id: "vents", icon: Icon.home, label: "Your lot", title: "Let water pass, then drain", detail: "Flood vents let water through foundation walls instead of pushing on them. Grade the yard so water runs away from the house." },
    );
    if ((flood === "none" || flood === "unsure" || flood === null) && weakGrade) {
      out.push({ id: "price", icon: Icon.alert, label: "Insurance", title: "Price an NFIP policy now", detail: "NFIP policies usually have a 30-day waiting period, so buy before storm season, not when a storm is named." });
    } else if (flood !== "nfip" && flood !== "private") {
      out.push({ id: "wait", icon: Icon.history, label: "Insurance", title: "Buy before storm season", detail: "NFIP policies usually have a 30-day waiting period before they start." });
    }
  } else {
    out.push(
      { id: "up", icon: Icon.home, label: "Inside", title: "Move valuables up", detail: "Keep documents, electronics and anything you can't replace on high shelves or upstairs." },
      ...(noCar ? [] : [{ ...car, detail: "Parking lots and low streets flood first. Move the car to higher ground when Fludd says to." }]),
    );
  }

  if (flood === "nfip") {
    out.push({
      id: "limits",
      icon: Icon.alert,
      label: "Your flood policy",
      title: "Know your NFIP limits",
      detail: tenure === "rent"
        ? "NFIP residential policies cover up to $100,000 for contents."
        : "NFIP residential policies cover up to $250,000 for the building and $100,000 for contents.",
    });
  } else if (flood === "private") {
    out.push({ id: "limits", icon: Icon.alert, label: "Your flood policy", title: "Check your limits", detail: "Find your building and contents limits on the declarations page before a storm." });
  } else {
    out.push({ id: "gap", icon: Icon.alert, label: "Insurance", title: "Flood is a separate policy", detail: "Standard home and renters policies do not cover flood damage." });
  }

  return out.slice(0, 4);
}

/** "For your situation": recommendations chosen by tenure, home type, floor and insurance. */
export function SituationAdvice({ profile, letter }: { profile: Profile; letter: Letter }) {
  const items = adviceFor(profile, letter);
  return (
    <Group title="For your situation">
      {items.map((a, i) => (
        <ListRow key={a.id} icon={a.icon} label={a.label} value={a.title} detail={a.detail} i={i} last={i === items.length - 1} />
      ))}
    </Group>
  );
}
