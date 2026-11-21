import type { Metadata } from "next";
import { Demo1 } from "@/components/demo/demo1";

export const metadata: Metadata = {
  title: "Neighbours report · Fludd demo",
  description: "Residents send photos of floodwater. See each simulated reading land on the real map, next to what the model said for that spot.",
};

export default function Demo1Page() {
  return <Demo1 />;
}
