import type { Metadata } from "next";
import { FoodHub } from "@/components/food/food-portal";

export const metadata: Metadata = { title: "Food share · Fludd" };

export default function Page() {
  return <FoodHub />;
}
