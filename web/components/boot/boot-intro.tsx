"use client";

import { Fraunces } from "next/font/google";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BootFilm, FPS, FRAMES } from "./boot-film";
import { signalBootDone } from "./boot-signal";
import "./boot-intro.css";

const wordmarkFont = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const WORDMARK = "Fludd";
const CAPTION = "Be a pelican.\nWatch the water, then move.";
const FADE_MS = 520;
/** The wordmark starts typing at 2.15 s, one letter every 0.1 s; the caption follows at 2.6 s. */
const TYPE_FROM = 64;
const FRAMES_PER_LETTER = 3;
const CAPTION_FROM = 78;

type Phase = "showing" | "leaving" | "done";
/** What this page load should do, decided once in the browser. "pending" is the server render. */
type Mode = "pending" | "skip" | "show";

let decided: Mode | null = null;

function decideMode(): Mode {
  if (decided) return decided;
  // The intro is the loading animation: it plays on every open (the flood data loads after it, see map-view).
  // The admin screen is a work tool, and reduced motion means no film: both skip it.
  decided = window.location.pathname.startsWith("/admin") || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "skip" : "show";
  return decided;
}

const subscribeNever = () => () => {};
const serverMode = (): Mode => "pending";

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
const screenSize = () => `${window.innerWidth}x${window.innerHeight}`;
const serverSize = () => "0x0";

/** Where the logo and the words sit on this screen: one centred block, a little above the middle. */
function layout(w: number, h: number) {
  const size = Math.min(320, w * 0.62, h * 0.34);
  const word = size * 0.29;
  const caption = Math.max(15, size * 0.09);
  const block = size + word * 1.1 + caption * 0.3 + caption * 1.3 * 2;
  const top = Math.max(h * 0.06, (h - block) / 2 - h * 0.04);
  return { size, cx: w / 2, cy: top + size / 2, textTop: top + size, word, caption };
}

/**
 * Full-screen intro shown once per browser session. The app renders underneath and is never blocked:
 * the intro can be skipped, and is not shown at all when the visitor prefers reduced motion or has
 * already seen it this session. It is drawn live, so it fits any screen and needs no video.
 */
export function BootIntro() {
  const mode = useSyncExternalStore(subscribeNever, decideMode, serverMode);
  const [w, h] = useSyncExternalStore(subscribeResize, screenSize, serverSize).split("x").map(Number);
  const [phase, setPhase] = useState<Phase>("showing");
  const [frame, setFrame] = useState(0);
  const leftRef = useRef(false);

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    setPhase("leaving");
    // The app starts its entrance as the intro zooms away, so the two overlap instead of queueing.
    signalBootDone();
    window.setTimeout(() => setPhase("done"), FADE_MS);
  }, []);

  // Not shown at all (already seen this session, or reduced motion): the app can arrive now.
  useEffect(() => {
    if (mode === "skip") signalBootDone();
  }, [mode]);

  // The film's clock. It steps on twos so the paper moves like stop motion, and leaves when the film ends.
  useEffect(() => {
    if (mode !== "show") return;
    let raf = 0;
    let start: number | null = null;
    let last = 0;
    const tick = (now: number) => {
      start ??= now;
      const f = Math.floor((((now - start) / 1000) * FPS) / 2) * 2;
      if (f !== last) {
        last = f;
        setFrame(Math.min(f, FRAMES));
      }
      if (f >= FRAMES) {
        leave();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, leave]);

  if (mode === "skip") return null;
  if (phase === "done") return null;

  const at = layout(w, h);
  const letters = frame < TYPE_FROM ? 0 : Math.floor((frame - TYPE_FROM) / FRAMES_PER_LETTER) + 1;
  // During the server render the layer is a plain night-coloured cover; the film mounts in the browser.
  return (
    <div className={`boot-layer ${phase === "leaving" ? "boot-leaving" : ""}`} role="presentation">
      {mode === "show" && w > 0 && (
        <div className="boot-stage">
          <BootFilm frame={frame} w={w} h={h} cx={at.cx} cy={at.cy} size={at.size} />
          <div className="boot-text" style={{ top: at.textTop }}>
            <p className={`boot-word ${wordmarkFont.className}`} style={{ fontSize: at.word }} aria-label={WORDMARK}>
              {WORDMARK.split("").map((letter, i) => (
                <span key={i} aria-hidden="true" style={{ opacity: i < letters ? 1 : 0 }}>
                  {letter}
                </span>
              ))}
            </p>
            <p className={`boot-caption ${frame >= CAPTION_FROM ? "boot-on" : ""}`} style={{ fontSize: at.caption, marginTop: at.caption * 0.3 }}>
              {CAPTION}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
