"use client";

import { useRef } from "react";

/**
 * "Watch the tour" on the welcome screen: a short captioned screen recording of the app, played in a native
 * dialog. It only ever starts from a tap, so a phone never refuses to play it, and it loads nothing until then.
 */
export function TourButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const open = () => {
    dialog.current?.showModal();
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => undefined);
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="pressable relative mt-5 flex h-11 items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 text-subhead font-semibold text-white backdrop-blur-md"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 1.5v11l9-5.5z" fill="currentColor" />
        </svg>
        Watch the 30-second tour
      </button>
      <dialog
        ref={dialog}
        aria-label="Fludd tour video"
        onClose={() => video.current?.pause()}
        onClick={(e) => {
          // A tap on the dimmed area around the video closes it.
          if (e.target === dialog.current) close();
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80"
      >
        <div className="relative">
          <video
            ref={video}
            src="/tour/fludd-tour.mp4"
            poster="/tour/fludd-tour.jpg"
            controls
            playsInline
            muted
            preload="none"
            className="block h-[min(88dvh,160vw)] w-auto rounded-[1.5rem] bg-black"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close the tour"
            className="pressable absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/60 text-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="m2 2 8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
      </dialog>
    </>
  );
}
