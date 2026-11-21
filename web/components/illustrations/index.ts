import { createElement, type ComponentType } from "react";
import { CameraIllustration } from "./camera";
import { DoneIllustration } from "./done";
import { DrivingIllustration } from "./driving";
import { EmptyAddressIllustration } from "./empty-address";
import { EmptyRewardsIllustration } from "./empty-rewards";
import { HomeIllustration } from "./home";
import { InsuranceIllustration } from "./insurance";
import { ParkingIllustration } from "./parking";
import type { IllustrationProps } from "./parts";
import { WelcomeIllustration } from "./welcome";

export {
  CameraIllustration,
  DoneIllustration,
  DrivingIllustration,
  EmptyAddressIllustration,
  EmptyRewardsIllustration,
  HomeIllustration,
  InsuranceIllustration,
  ParkingIllustration,
  WelcomeIllustration,
};
export type { IllustrationProps };

/**
 * Which picture each onboarding screen shows. Keys are the ScreenId values in onboarding/onboarding-screen.tsx;
 * tests/components/illustrations.test.ts fails if a screen is added there without art here.
 */
export const STEP_ILLUSTRATIONS = {
  welcome: WelcomeIllustration,
  tenure: HomeIllustration,
  type: HomeIllustration,
  floor: HomeIllustration,
  address: HomeIllustration,
  park: ParkingIllustration,
  drive: DrivingIllustration,
  flood: InsuranceIllustration,
  contents: InsuranceIllustration,
  policy: InsuranceIllustration,
  camera: CameraIllustration,
  done: DoneIllustration,
} satisfies Record<string, ComponentType<IllustrationProps>>;

export type IllustratedStep = keyof typeof STEP_ILLUSTRATIONS;

export function illustrationForStep(step: IllustratedStep): ComponentType<IllustrationProps> {
  return STEP_ILLUSTRATIONS[step];
}

/** The picture for one onboarding screen. */
export function StepIllustration({ step, ...props }: IllustrationProps & { step: IllustratedStep }) {
  return createElement(STEP_ILLUSTRATIONS[step], props);
}
