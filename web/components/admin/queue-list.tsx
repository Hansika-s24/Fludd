"use client";

import { useId, useState } from "react";
import { Group } from "@/components/ui/surface";
import { depthWords, metresFromInches, percent, rangeWords } from "@/components/report/depth-words";
import { adminAccessToken } from "@/lib/supabase";
import type { ApiError, QueueItem } from "@/lib/types";

type Decision = { decision: "approve" } | { decision: "reject" } | { decision: "edit"; depthM: number };

const MAX_DEPTH_IN = 196; // the route accepts 0 to 5 m

function isApiError(v: unknown): v is ApiError {
  if (typeof v !== "object" || v === null || !("error" in v)) return false;
  const e = (v as { error: unknown }).error;
  return typeof e === "object" && e !== null && typeof (e as { message?: unknown }).message === "string";
}

async function moderate(id: string, body: Decision): Promise<void> {
  const token = await adminAccessToken();
  if (!token) throw new Error("Your sign-in has expired, sign in again.");
  let res: Response;
  try {
    res = await fetch(`/api/reports/${encodeURIComponent(id)}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The decision could not be sent. Check your connection and try again.");
  }
  if (res.ok) return;
  const answer: unknown = await res.json().catch(() => null);
  throw new Error(isApiError(answer) ? answer.error.message : `The decision could not be saved (${res.status}).`);
}

/** The reader returns this placeholder when Gemini could not read the photo. */
function readingUnavailable(r: QueueItem["aiReading"]): boolean {
  return r.confidence === 0 && r.reference === "reading unavailable";
}

const timeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function QueueList({ items, onDecided }: { items: QueueItem[]; onDecided: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <Group title="Waiting for review">
        <p className="px-4 py-3 text-subhead text-label-2">Nothing waiting. New reports appear here.</p>
      </Group>
    );
  }
  return (
    <Group title={`Waiting for review (${items.length})`}>
      {items.map((item, i) => (
        <QueueRow key={item.id} item={item} last={i === items.length - 1} onDecided={onDecided} />
      ))}
    </Group>
  );
}

function QueueRow({ item, last, onDecided }: { item: QueueItem; last: boolean; onDecided: (id: string) => void }) {
  const depthId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [depthIn, setDepthIn] = useState("");
  const r = item.aiReading;
  const unread = readingUnavailable(r);
  const [lng, lat] = item.exactPosition;

  async function decide(body: Decision) {
    setBusy(true);
    setError(null);
    try {
      await moderate(item.id, body);
      onDecided(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The decision could not be saved.");
      setBusy(false);
    }
  }

  const parsedIn = Number(depthIn);
  const depthValid = depthIn.trim() !== "" && Number.isFinite(parsedIn) && parsedIn >= 0 && parsedIn <= MAX_DEPTH_IN;

  return (
    <article className={`flex flex-col gap-3 px-4 py-4 sm:flex-row ${last ? "" : "border-b border-separator"}`}>
      {item.photoUrl ? (
        <a href={item.photoUrl} target="_blank" rel="noreferrer" className="shrink-0 sm:w-48">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Supabase link */}
          <img
            src={item.photoUrl}
            alt="Reported flooding"
            className="aspect-[4/3] w-full rounded-[var(--radius-control)] bg-fill object-cover"
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] w-full shrink-0 self-start items-center justify-center rounded-[var(--radius-control)] bg-fill text-footnote text-label-2 sm:w-48">
          Photo unavailable
        </div>
      )}

      <div className="min-w-0 flex-1">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-subhead">
          <dt className="text-label-2">AI reading</dt>
          <dd>
            {unread
              ? "Unavailable, judge by eye"
              : r.waterPresent
                ? rangeWords(r.depthRangeM)
                : "No water seen"}
          </dd>
          {!unread && (
            <>
              <dt className="text-label-2">Against</dt>
              <dd className="min-w-0 break-words">{r.reference}</dd>
              <dt className="text-label-2">Confidence</dt>
              <dd className={r.confidence < 0.5 ? "text-warn" : ""}>{percent(r.confidence)}</dd>
            </>
          )}
          <dt className="text-label-2">Model depth</dt>
          <dd>{depthWords(item.modelDepthM)}</dd>
          <dt className="text-label-2">Sent</dt>
          <dd>
            <time dateTime={item.createdAt}>{timeFormat.format(new Date(item.createdAt))}</time>
          </dd>
          <dt className="text-label-2">Position</dt>
          <dd className="tabular-nums">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </dd>
        </dl>

        {editing && (
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (depthValid && !busy) void decide({ decision: "edit", depthM: metresFromInches(parsedIn) });
            }}
          >
            <label htmlFor={depthId} className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-footnote text-label-2">Confirmed depth, inches</span>
              <input
                id={depthId}
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_DEPTH_IN}
                step={0.5}
                autoFocus
                value={depthIn}
                onChange={(e) => setDepthIn(e.target.value)}
                className="min-h-11 rounded-[var(--radius-control)] bg-fill px-3 text-subhead outline-none focus-visible:ring-2 focus-visible:ring-tint"
              />
            </label>
            <button
              type="submit"
              disabled={!depthValid || busy}
              className="pressable min-h-11 rounded-[var(--radius-control)] bg-tint px-4 text-subhead font-semibold text-white active:bg-tint-pressed disabled:opacity-40"
            >
              Save and approve
            </button>
          </form>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || unread}
            onClick={() => void decide({ decision: "approve" })}
            className="pressable min-h-11 rounded-[var(--radius-control)] bg-tint px-4 text-subhead font-semibold text-white active:bg-tint-pressed disabled:opacity-40"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            className="pressable min-h-11 rounded-[var(--radius-control)] bg-fill px-4 text-subhead font-medium text-tint disabled:opacity-40"
          >
            {editing ? "Cancel edit" : "Edit depth"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide({ decision: "reject" })}
            className="pressable min-h-11 rounded-[var(--radius-control)] bg-fill px-4 text-subhead font-medium text-late disabled:opacity-40"
          >
            Reject
          </button>
        </div>
        {unread && <p className="pt-1.5 text-footnote text-label-2">No AI reading, so set the depth with Edit depth.</p>}
        {error && (
          <p role="alert" className="pt-1.5 text-footnote text-late">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
