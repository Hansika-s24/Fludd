"use client";

import { Fraunces } from "next/font/google";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import "./boot-intro.css";

const wordmarkFont = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const WORDMARK = "Fludd";
const CAPTION = "Be a pelican.\nWatch the water, then move.";
const SEEN_KEY = "fludd-boot-seen";
/** If the video has not started by now, give up on it. A slow network must never block the app. */
const START_TIMEOUT_MS = 1500;
const FADE_MS = 450;

type Phase = "showing" | "leaving" | "done";
/** What this page load should do, decided once in the browser. "pending" is the server render. */
type Mode = "pending" | "skip" | "desktop" | "phone";

let decided: Mode | null = null;

function decideMode(): Mode {
  if (decided) return decided;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    seen = false;
  }
  if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    decided = "skip";
  else
    decided =
      window.innerHeight > window.innerWidth * 1.15 ? "phone" : "desktop";
  return decided;
}

const subscribeNever = () => () => {};
const serverMode = (): Mode => "pending";

/**
 * Full-screen intro shown once per browser session. The app renders underneath and is never blocked:
 * the intro can be skipped, skips itself if the video does not start, and is not shown at all when
 * the visitor prefers reduced motion or has already seen it this session.
 */
export function BootIntro() {
  const mode = useSyncExternalStore(subscribeNever, decideMode, serverMode);
  const [phase, setPhase] = useState<Phase>("showing");
  const [started, setStarted] = useState(false);
  const leftRef = useRef(false);

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage can be unavailable (private mode). The intro then simply shows again next load.
    }
    setPhase("leaving");
    window.setTimeout(() => setPhase("done"), FADE_MS);
  }, []);

  useEffect(() => {
    if (mode !== "desktop" && mode !== "phone") return;
    const giveUp = window.setTimeout(() => {
      if (
        !document.querySelector<HTMLVideoElement>("[data-boot-video]")
          ?.currentTime
      )
        leave();
    }, START_TIMEOUT_MS);
    return () => window.clearTimeout(giveUp);
  }, [mode, leave]);

  if (mode === "skip") return null;
  if (phase === "done") return null;

  // During the server render the layer is a plain page-coloured cover; the video mounts in the browser.
  const tall = mode === "phone";
  const variant = mode === "phone" ? "phone" : "desktop";
  return (
    <div
      className={`boot-layer ${phase === "leaving" ? "boot-leaving" : ""}`}
      onClick={leave}
      role="presentation"
    >
      <div
        className={`boot-stage ${tall ? "boot-tall" : ""} ${started ? "boot-started" : ""}`}
      >
        {mode !== "pending" && (
          <video
            key={variant}
            data-boot-video
            // React sets `muted` as a property after insertion, which browsers treat as unmuted and block
            // autoplay. Mute on the element and start it explicitly; if play() is refused, the give-up timer skips.
            ref={(el) => {
              if (!el) return;
              el.muted = true;
              el.play().catch(() => {});
            }}
            className="boot-video"
            autoPlay
            muted
            playsInline
            preload="auto"
            poster={`/boot/boot-${variant}.jpg`}
            aria-hidden="true"
            onPlaying={() => setStarted(true)}
            onEnded={leave}
            onError={leave}
          >
            <source src={`/boot/boot-${variant}.webm`} type="video/webm" />
            <source src={`/boot/boot-${variant}.mp4`} type="video/mp4" />
          </video>
        )}
        <div className="boot-text">
          <p
            className={`boot-word ${wordmarkFont.className}`}
            aria-label={WORDMARK}
          >
            {WORDMARK.split("").map((letter, i) => (
              <span
                key={i}
                className="boot-letter"
                style={{ "--i": i } as CSSProperties}
                aria-hidden="true"
              >
                {letter}
                <span
                  className={`boot-caret ${i === WORDMARK.length - 1 ? "boot-last" : ""}`}
                  style={{ "--i": i } as CSSProperties}
                />
              </span>
            ))}
          </p>
          <p className="boot-caption">{CAPTION}</p>
        </div>
      </div>
      <button
        type="button"
        className="boot-skip"
        onClick={(event) => {
          event.stopPropagation();
          leave();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
