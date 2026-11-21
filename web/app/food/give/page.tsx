import type { Metadata } from "next";
import { FoodGive } from "@/components/food/food-portal";

export const metadata: Metadata = { title: "Give food · Fludd" };

export default function Page() {
  return <FoodGive />;
}
