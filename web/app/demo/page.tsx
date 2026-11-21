import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Fludd demos",
  description: "Three short guided walks through Fludd on the real map and the real model.",
};

const DEMOS = [
  {
    href: "/demo/1",
    title: "Neighbours report",
    line: "People send photos of the water. See each reading land on the map, next to what the model said for that spot.",
    note: "Simulated reports on the real model",
  },
  {
    href: "/demo/2",
    title: "Moving or building",
    line: "Two real addresses side by side: one the official map calls low risk and the model floods, with a checklist for buying or building there.",
    note: "Real addresses, real grades",
  },
  {
    href: "/demo/3",
    title: "Your camera is a gauge",
    line: "A spare phone pointed at your parking spot reads the water at your own kerb, every few minutes, and sets it against the model.",
    note: "Simulated camera on the real model",
  },
] as const;

export default function DemoIndex() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <Logo size={30} />
      <h1 className="mt-6 text-balance text-title font-bold">See Fludd with people on it</h1>
      <p className="mt-2 text-subhead text-label-2">
        Three short guided walks. Each runs on the real map and the real flood model; anything made up for the walk is labelled on screen.
      </p>
      <ol className="mt-6 space-y-3">
        {DEMOS.map((d, i) => (
          <li key={d.href} className="rise-in" style={{ animationDelay: `${i * 60}ms` }}>
            <Link href={d.href} className="pressable block rounded-[var(--radius-group)] bg-group px-4 py-4">
              <p className="text-footnote font-semibold text-tint">Demo {i + 1}</p>
              <p className="mt-0.5 text-headline font-semibold">{d.title}</p>
              <p className="mt-1 text-subhead text-label-2">{d.line}</p>
              <p className="mt-2 text-footnote text-label-3">{d.note}</p>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/" className="mt-6 text-subhead font-medium text-tint">
        Open the app instead
      </Link>
    </main>
  );
}
