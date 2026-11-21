import type { Metadata } from "next";
import { Demo3 } from "@/components/demo/demo3";

export const metadata: Metadata = {
  title: "Your camera is a gauge · Fludd demo",
  description: "A camera you already have, or a spare phone, pointed at your parking spot reads the water at your own kerb, set against the flood model. The camera readings are simulated.",
};

export default function Demo3Page() {
  return <Demo3 />;
}
