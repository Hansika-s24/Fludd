import type { Metadata } from "next";
import { FoodNeed } from "@/components/food/food-portal";

export const metadata: Metadata = { title: "Get food · Fludd" };

export default function Page() {
  return <FoodNeed />;
}
