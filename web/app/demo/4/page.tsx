import type { Metadata } from "next";
import { Demo4 } from "@/components/demo/demo4";

export const metadata: Metadata = {
  title: "Food after the flood · Fludd demo",
  description: "A restaurant has meals it cannot sell and a street cannot cook. Walk through simulated offers on the real flood map, claimed without a name.",
};

export default function Demo4Page() {
  return <Demo4 />;
}
