"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { isBootDone, onBootDone } from "@/components/boot/boot-signal";
import "./intro.css";

const TAGLINE = "See what the flood map doesn't tell you about any address near USF.";

function greetingFor(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const subscribeNever = () => () => {};
const clientGreeting = () => greetingFor(new Date().getHours());
const serverGreeting = () => null;
const serverBootDone = () => false;

function letterTone(letter: string): string {
  if (letter === "A" || letter === "B") return "text-safe";
  if (letter === "C") return "text-warn";
  if (letter === "D" || letter === "F") return "text-late";
  return "text-label";
}

function Word({ text, i, ready, className = "" }: { text: string; i: number; ready: boolean; className?: string }) {
  return (
    <span className={`${ready ? "intro-word" : "intro-word-wait"} ${className}`} style={{ "--i": i } as CSSProperties}>
      {text}
    </span>
  );
}

/** Splits a phrase into staggered words starting at index `from`, with real spaces between them. */
function words(phrase: string, from: number, ready: boolean) {
  return phrase.split(" ").map((w, k) => (
    <span key={k}>
      {k > 0 && " "}
      <Word text={w} i={from + k} ready={ready} />
    </span>
  ));
}

/**
 * The top of the surface: a time-of-day greeting and either the home's grade or the one-line pitch.
 * Text is held back until the boot intro is out of the way, then rises word by word. The greeting is
 * read on the client only, so the server and first client render agree.
 */
export function Greeting({ homeLabel, homeLetter }: { homeLabel?: string | null; homeLetter?: string | null }) {
  const greeting = useSyncExternalStore(subscribeNever, clientGreeting, serverGreeting);
  const ready = useSyncExternalStore(onBootDone, isBootDone, serverBootDone) && greeting !== null;

  const letter = homeLetter?.trim().toUpperCase() || null;
  const title = greeting ?? "Good evening";
  const titleWords = title.split(" ").length;

  return (
    <header className="px-5 pt-5 pb-1" aria-busy={!ready}>
      <h1 className="text-title font-bold text-label">{words(title, 0, ready)}</h1>
      {letter ? (
        <>
          <p className="mt-1 text-subhead text-label-2">
            {words("Your home grades", titleWords, ready)}{" "}
            <Word text={letter} i={titleWords + 3} ready={ready} className={`font-bold ${letterTone(letter)}`} />
          </p>
          {homeLabel && (
            <p className="text-subhead text-label-2">
              <Word text={homeLabel} i={titleWords + 4} ready={ready} className="max-w-full truncate align-bottom" />
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-subhead text-label-2">{words(TAGLINE, titleWords, ready)}</p>
      )}
    </header>
  );
}
