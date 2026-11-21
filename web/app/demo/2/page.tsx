import type { Metadata } from "next";
import { Demo2 } from "@/components/demo/demo2";

export const metadata: Metadata = {
  title: "Moving or building · Fludd demo",
  description: "Two real addresses on one street: what the official flood map says, what the model found, and a checklist for buying, renting or building there.",
};

export default function Demo2Page() {
  return <Demo2 />;
}
