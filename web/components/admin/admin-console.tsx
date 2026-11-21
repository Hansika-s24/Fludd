"use client";

import { useCallback, useEffect, useState } from "react";
import { Group } from "@/components/ui/surface";
import { adminAccessToken, adminSignOut, getCalibration, getQueue } from "@/lib/supabase";
import type { Calibration, QueueItem } from "@/lib/types";
import { CalibrationPanel } from "./calibration-panel";
import { QueueList } from "./queue-list";
import { SignInForm } from "./sign-in-form";

type Session = "checking" | "signedOut" | "signedIn";

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Admin screen: sign in, review the waiting photos, watch the model's error. */
export function AdminConsole() {
  const [session, setSession] = useState<Session>("checking");
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [q, c] = await Promise.allSettled([getQueue(), getCalibration()]);
    if (q.status === "fulfilled") {
      setQueue(q.value);
      setQueueError(null);
    } else setQueueError(message(q.reason, "Could not load the queue."));
    if (c.status === "fulfilled") {
      setCalibration(c.value);
      setCalibrationError(null);
    } else setCalibrationError(message(c.reason, "Could not load calibration."));
  }, []);

  // A saved session from an earlier visit skips the form; the route still checks admin rights on every decision.
  useEffect(() => {
    let live = true;
    void adminAccessToken().then((token) => {
      if (!live) return;
      setSession(token ? "signedIn" : "signedOut");
      if (token) void load();
    });
    return () => {
      live = false;
    };
  }, [load]);

  async function signOut() {
    await adminSignOut();
    setQueue(null);
    setCalibration(null);
    setSession("signedOut");
  }

  return (
    <main
      className={`mx-auto w-full ${session === "signedIn" ? "max-w-3xl" : "max-w-md"} pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]`}
    >
      <header className="flex items-center justify-between gap-3 px-4">
        <div className="px-3">
          <h1 className="text-title font-bold">Review reports</h1>
          <p className="text-subhead text-label-2">Fludd admin</p>
        </div>
        {session === "signedIn" && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void load()}
              className="pressable min-h-11 rounded-[var(--radius-control)] px-3 text-subhead font-medium text-tint"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="pressable min-h-11 rounded-[var(--radius-control)] px-3 text-subhead font-medium text-tint"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {session === "checking" && <p className="px-7 pt-6 text-subhead text-label-2">Checking sign-in</p>}

      {session === "signedOut" && (
        <SignInForm
          onSignedIn={() => {
            setSession("signedIn");
            void load();
          }}
        />
      )}

      {session === "signedIn" && (
        <>
          {queueError ? (
            <Group title="Waiting for review">
              <p role="alert" className="px-4 py-3 text-subhead text-late">
                {queueError}
              </p>
            </Group>
          ) : queue === null ? (
            <Group title="Waiting for review">
              <p className="px-4 py-3 text-subhead text-label-2">Loading</p>
            </Group>
          ) : (
            <QueueList
              items={queue}
              onDecided={(id) => {
                setQueue((q) => (q ? q.filter((x) => x.id !== id) : q));
                void getCalibration().then(setCalibration, () => undefined);
              }}
            />
          )}
          <CalibrationPanel calibration={calibration} error={calibrationError} />
        </>
      )}
    </main>
  );
}
