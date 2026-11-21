"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AddressSearch } from "@/components/report-card/address-search";
import { LogoMark } from "@/components/ui/logo";
import { KIND_WORDS, KINDS, type Kind } from "@/lib/food/share";
import type { LngLat } from "@/lib/types";

const PROFILE_KEY = "fludd-profile-v1";
const GIVER_KEY = "fludd-giver-v1";
const REQUEST_KEY = "fludd-food-request-v1";

interface PublicGiver {
  id: string;
  name: string;
  address: string;
  position: LngLat;
  radiusMi: number;
  kinds: Kind[];
  offer: string;
  window: string;
  distanceM?: number;
}

const miles = (m: number) => `${(m / 1609.34).toFixed(1)} mi`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the page still works, it just will not remember.
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !body) throw new Error(body?.error?.message ?? "Food share is unavailable right now");
  return body;
}

/** The page frame: brand bar, title, content, and the floodwater rule at the bottom. */
export function FoodFrame({ title, lede, back = "/food", children }: { title: string; lede: string; back?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-y-auto bg-[oklch(0.975_0.004_260)] pb-[max(2rem,env(safe-area-inset-bottom))] text-label">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-separator bg-[oklch(0.975_0.004_260/0.9)] px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href={back} className="pressable flex min-h-11 items-center gap-1 text-body font-medium text-tint">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 5-7 7 7 7" />
          </svg>
          Back
        </Link>
        <Link href="/" aria-label="Fludd map" className="pressable flex min-h-11 items-center">
          <LogoMark size={28} />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[520px] px-4">
        <h1 className="rise-in pt-6 text-title font-bold">{title}</h1>
        <p className="rise-in mt-2 text-body text-label-2 text-pretty">{lede}</p>
        {children}
        <p className="mt-8 text-footnote text-label-3">
          Never drive or walk into floodwater to give or get food. If water is rising inside, call 911. For any other help, call 211.
        </p>
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mt-4 rounded-[var(--radius-group)] bg-group p-4 ${className}`}>{children}</section>;
}

function KindPicker({ value, onChange, legend }: { value: Kind[]; onChange: (k: Kind[]) => void; legend: string }) {
  return (
    <fieldset>
      <legend className="text-subhead font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const on = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
              className={`pressable min-h-11 rounded-full px-4 text-subhead font-medium ${on ? "bg-tint text-white" : "bg-fill text-label"}`}
            >
              {KIND_WORDS[k]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PlacePicker({ label, place, onPlace }: { label: string; place: { label: string; position: LngLat } | null; onPlace: (p: { label: string; position: LngLat } | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <p className="text-subhead font-semibold">{label}</p>
      <AddressSearch
        onPick={(m, err) => {
          setError(err ?? (m ? null : "We couldn't find that address."));
          onPlace(m ? { label: m.label, position: m.position } : null);
        }}
      />
      {place && <p className="mt-2 text-footnote text-label-2">Using: {place.label}</p>}
      {error && <p role="alert" className="mt-2 text-footnote text-late">{error}</p>}
    </div>
  );
}

/** /food: two doors and the leaderboard. */
export function FoodHub() {
  const [board, setBoard] = useState<{ name: string; served: number; radiusMi: number }[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    api<{ givers: PublicGiver[]; leaderboard: { name: string; served: number; radiusMi: number }[] }>("/api/food/givers").then(
      (b) => {
        setBoard(b.leaderboard);
        setCount(b.givers.length);
      },
      () => setBoard([]),
    );
  }, []);

  return (
    <FoodFrame
      back="/"
      title="Food share"
      lede="During a flood, restaurants, grocers and churches nearby offer meals, groceries, water and supplies. Neighbours who need them ask without giving a name."
    >
      <div className="mt-5 grid gap-3">
        <Link href="/food/need" className="pressable rise-in block rounded-[var(--radius-group)] bg-tint p-5 text-white shadow-[0_8px_20px_rgb(10_108_255/0.25)]">
          <span className="block text-headline font-semibold">I need food or supplies</span>
          <span className="mt-1 block text-subhead text-white/85">No account, no name. See who is giving near you and get a pickup code.</span>
        </Link>
        <Link href="/food/give" className="pressable rise-in block rounded-[var(--radius-group)] bg-group p-5">
          <span className="block text-headline font-semibold">I can give</span>
          <span className="mt-1 block text-subhead text-label-2">Restaurants, stores, churches and groups: post what you can hand out and the area you cover.</span>
        </Link>
      </div>

      <Card>
        <h2 className="text-headline font-semibold">Giving leaderboard</h2>
        <p className="mt-1 text-footnote text-label-2">
          {count === null ? "Loading…" : `${count} ${count === 1 ? "giver is" : "givers are"} signed up.`} People served, as givers report them, rounded to tens.
        </p>
        {board === null ? (
          <div className="mt-3 space-y-2">
            <div className="shimmer h-5 w-2/3 rounded-md" />
            <div className="shimmer h-5 w-1/2 rounded-md" />
          </div>
        ) : board.length === 0 ? (
          <p className="mt-3 text-subhead text-label-2">No one has reported serving yet. Be the first.</p>
        ) : (
          <ol className="mt-3 divide-y divide-separator">
            {board.map((g, i) => (
              <li key={g.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-3">
                  <span className={`grid size-7 place-items-center rounded-full text-footnote font-bold ${i === 0 ? "bg-warn text-white" : "bg-fill text-label-2"}`}>{i + 1}</span>
                  <span>
                    <span className="block text-body font-medium">{g.name}</span>
                    <span className="block text-footnote text-label-2">Covers {g.radiusMi} mi around them</span>
                  </span>
                </span>
                <span className="text-headline font-semibold tabular-nums">{g.served}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <h2 className="text-headline font-semibold">How privacy works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-subhead text-label-2">
          <li>People who ask give no name, phone or email. Fludd keeps only an area about 500 m wide, how many people, and what is needed.</li>
          <li>Givers see a count of requests in their area, never who asked or where exactly.</li>
          <li>Requests are deleted after 48 hours.</li>
        </ul>
      </Card>
    </FoodFrame>
  );
}

/** /food/need: anonymous request, then givers in reach and a pickup code. */
export function FoodNeed() {
  const [place, setPlace] = useState<{ label: string; position: LngLat } | null>(null);
  const [needs, setNeeds] = useState<Kind[]>([]);
  const [people, setPeople] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; givers: PublicGiver[] } | null>(null);

  useEffect(() => {
    // Start from the saved home, if the person set one up.
    const home = read<{ home?: { label: string; position: LngLat } | null }>(PROFILE_KEY)?.home;
    const last = read<{ code: string; givers: PublicGiver[]; at: number }>(REQUEST_KEY);
    const t = window.setTimeout(() => {
      if (home) setPlace(home);
      if (last && Date.now() - last.at < 48 * 3_600_000) setResult({ code: last.code, givers: last.givers });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  function locate() {
    setError(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => setPlace({ label: "Your current location", position: [p.coords.longitude, p.coords.latitude] }),
      () => setError("We couldn't get your location. Search an address instead."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function ask() {
    if (!place) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ code: string; givers: PublicGiver[] }>("/api/food/requests", {
        method: "POST",
        body: JSON.stringify({ position: place.position, people, needs }),
      });
      setResult(r);
      write(REQUEST_KEY, { ...r, at: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <FoodFrame title="You're on the list" lede="Show this code when you pick up. It is not linked to your name.">
        <Card className="text-center">
          <p className="text-footnote font-semibold uppercase tracking-[0.05em] text-label-2">Pickup code</p>
          <p className="pop-in mt-1 text-[2.75rem] font-bold tracking-[0.12em] tabular-nums">{result.code}</p>
        </Card>
        <h2 className="mt-6 text-headline font-semibold">{result.givers.length ? "Giving near you" : "No one is giving in your area yet"}</h2>
        {result.givers.length === 0 && (
          <p className="mt-1 text-subhead text-label-2">Givers in your area will see that people nearby asked. Meanwhile, call 211 for food sites open today.</p>
        )}
        {result.givers.map((g, i) => (
          <Card key={g.id} className="rise-in">
            <div style={{ ["--i" as string]: i }} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-headline font-semibold">{g.name}</p>
                <p className="text-subhead text-label-2">{g.offer}</p>
                <p className="mt-1 text-footnote text-label-2">{g.window} · {g.address}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {g.kinds.map((k) => (
                    <span key={k} className="rounded-full bg-fill px-2.5 py-0.5 text-[0.75rem] font-medium">{KIND_WORDS[k]}</span>
                  ))}
                </p>
              </div>
              {g.distanceM !== undefined && <span className="shrink-0 text-subhead tabular-nums text-label-2">{miles(g.distanceM)}</span>}
            </div>
            <a
              href={`https://maps.apple.com/?daddr=${g.position[1]},${g.position[0]}`}
              target="_blank"
              rel="noreferrer"
              className="pressable mt-3 flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-fill text-body font-medium text-tint"
            >
              Directions
            </a>
          </Card>
        ))}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            write(REQUEST_KEY, null);
          }}
          className="pressable mt-4 min-h-11 w-full text-subhead font-medium text-tint"
        >
          Ask again
        </button>
      </FoodFrame>
    );
  }

  return (
    <FoodFrame title="I need food or supplies" lede="Tell us roughly where you are and what you need. No name, phone or email.">
      <Card>
        <PlacePicker label="Where are you?" place={place} onPlace={setPlace} />
        <button type="button" onClick={locate} className="pressable mt-2 min-h-11 text-subhead font-medium text-tint">
          Use my current location
        </button>
        <p className="text-footnote text-label-3">Only an area about 500 m wide is kept, never your exact spot.</p>
      </Card>
      <Card>
        <KindPicker legend="What do you need? (pick any, or none for anything)" value={needs} onChange={setNeeds} />
      </Card>
      <Card>
        <label className="flex items-center justify-between gap-3">
          <span className="text-subhead font-semibold">How many people?</span>
          <span className="flex items-center gap-2">
            <button type="button" aria-label="Fewer" onClick={() => setPeople((n) => Math.max(1, n - 1))} className="pressable grid size-11 place-items-center rounded-full bg-fill text-headline">−</button>
            <output className="w-8 text-center text-headline font-semibold tabular-nums">{people}</output>
            <button type="button" aria-label="More" onClick={() => setPeople((n) => Math.min(12, n + 1))} className="pressable grid size-11 place-items-center rounded-full bg-fill text-headline">+</button>
          </span>
        </label>
      </Card>
      {error && <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-group px-4 py-3 text-subhead">{error}</p>}
      <button
        type="button"
        disabled={!place || busy}
        onClick={ask}
        className="pressable mt-5 h-[3.25rem] w-full rounded-[0.875rem] bg-tint text-body font-semibold text-white disabled:bg-fill disabled:text-label-3"
      >
        {busy ? "Finding givers…" : "Find food near me"}
      </button>
    </FoodFrame>
  );
}

interface Dashboard {
  giver: PublicGiver & { served: number };
  demand: { requests: number; people: number };
}

/** /food/give: sign up as a giver, then a private dashboard on this device. */
export function FoodGive() {
  const [saved, setSaved] = useState<{ id: string; token: string } | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState<{ label: string; position: LngLat } | null>(null);
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [offer, setOffer] = useState("");
  const [window_, setWindow] = useState("");
  const [radiusMi, setRadius] = useState<1 | 2 | 3>(2);
  const [served, setServed] = useState("");

  useEffect(() => {
    // A dashboard link opened on another phone carries "#<id>.<token>": keep it on this device too.
    const m = window.location.hash.match(/^#([0-9a-f-]{36})\.([\w-]{10,})$/);
    if (m) write(GIVER_KEY, { id: m[1], token: m[2] });
    const s = read<{ id: string; token: string }>(GIVER_KEY);
    const t = window.setTimeout(() => s && setSaved(s), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!saved) return;
    let stale = false;
    const load = () =>
      api<Dashboard>(`/api/food/givers/${saved.id}?token=${encodeURIComponent(saved.token)}`).then(
        (d) => !stale && setDash(d),
        (e: unknown) => !stale && setError(e instanceof Error ? e.message : "Could not load your dashboard"),
      );
    void load();
    const t = window.setInterval(load, 60_000);
    return () => {
      stale = true;
      window.clearInterval(t);
    };
  }, [saved]);

  async function signUp() {
    if (!place) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string; token: string }>("/api/food/givers", {
        method: "POST",
        body: JSON.stringify({ name, address: place.label, position: place.position, radiusMi, kinds, offer, window: window_ }),
      });
      write(GIVER_KEY, r);
      setSaved(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function addServed() {
    const n = Number(served);
    if (!saved || !Number.isInteger(n) || n < 1) return;
    try {
      const r = await api<{ served: number }>(`/api/food/givers/${saved.id}`, { method: "POST", body: JSON.stringify({ token: saved.token, served: n }) });
      setDash((d) => (d ? { ...d, giver: { ...d.giver, served: r.served } } : d));
      setServed("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  if (saved) {
    const link = typeof window === "undefined" ? "" : `${window.location.origin}/food/give#${saved.id}.${saved.token}`;
    return (
      <FoodFrame title={dash?.giver.name ?? "Your giving"} lede="Your private dashboard on this device. Neighbours see your offer on the food share.">
        {error && <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-group px-4 py-3 text-subhead">{error}</p>}
        {!dash ? (
          <Card><div className="shimmer h-16 rounded-md" /></Card>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card className="!mt-0">
                <p className="text-footnote text-label-2">People asking in your {dash.giver.radiusMi} mi</p>
                <p className="mt-1 text-[2rem] font-bold tabular-nums">{dash.demand.people === 4 && dash.demand.requests === 4 ? "< 5" : dash.demand.people}</p>
                <p className="text-footnote text-label-3">Last 48 hours, rounded</p>
              </Card>
              <Card className="!mt-0">
                <p className="text-footnote text-label-2">People you served</p>
                <p className="mt-1 text-[2rem] font-bold tabular-nums">{dash.giver.served}</p>
                <p className="text-footnote text-label-3">Shown on the leaderboard</p>
              </Card>
            </div>
            <Card>
              <p className="text-subhead font-semibold">Log people served</p>
              <p className="text-footnote text-label-2">Ask for the 6-digit pickup code; you do not need names.</p>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="numeric"
                  value={served}
                  onChange={(e) => setServed(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="How many"
                  aria-label="People served"
                  className="h-11 min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3.5 text-body outline-none focus-visible:ring-2 focus-visible:ring-tint"
                />
                <button type="button" onClick={addServed} disabled={!served} className="pressable h-11 rounded-[var(--radius-control)] bg-tint px-5 text-body font-semibold text-white disabled:bg-fill disabled:text-label-3">
                  Add
                </button>
              </div>
            </Card>
            <Card>
              <p className="text-subhead font-semibold">Your offer</p>
              <p className="mt-1 text-body">{dash.giver.offer}</p>
              <p className="text-footnote text-label-2">{dash.giver.window} · {dash.giver.address}</p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {dash.giver.kinds.map((k) => (
                  <span key={k} className="rounded-full bg-fill px-2.5 py-0.5 text-[0.75rem] font-medium">{KIND_WORDS[k]}</span>
                ))}
              </p>
            </Card>
          </>
        )}
        <Card>
          <p className="text-subhead font-semibold">Keep this link private</p>
          <p className="text-footnote text-label-2">It opens this dashboard on another phone. Anyone with it can log servings for you.</p>
          <p className="mt-2 break-all rounded-[var(--radius-control)] bg-fill px-3 py-2 text-footnote">{link}</p>
        </Card>
      </FoodFrame>
    );
  }

  const ready = name.trim().length >= 2 && place && kinds.length > 0 && offer.trim().length >= 3 && window_.trim().length >= 3;
  const field = "mt-1 h-11 w-full rounded-[var(--radius-control)] bg-fill px-3.5 text-body outline-none focus-visible:ring-2 focus-visible:ring-tint";
  return (
    <FoodFrame title="I can give" lede="Post what you can hand out during a flood. People nearby see your offer; you see how many asked in your area.">
      <Card>
        <label className="block">
          <span className="text-subhead font-semibold">Business or group name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ella's Kitchen" className={field} />
        </label>
      </Card>
      <Card>
        <PlacePicker label="Where do people pick up?" place={place} onPlace={setPlace} />
      </Card>
      <Card>
        <KindPicker legend="What can you give?" value={kinds} onChange={setKinds} />
        <label className="mt-4 block">
          <span className="text-subhead font-semibold">In a sentence</span>
          <input value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={160} placeholder="100 hot meals and bottled water" className={field} />
        </label>
        <label className="mt-4 block">
          <span className="text-subhead font-semibold">When</span>
          <input value={window_} onChange={(e) => setWindow(e.target.value)} maxLength={80} placeholder="Sat 11 am to 2 pm" className={field} />
        </label>
      </Card>
      <Card>
        <p className="text-subhead font-semibold">How far do you cover?</p>
        <div role="radiogroup" aria-label="Radius" className="mt-2 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={radiusMi === r}
              onClick={() => setRadius(r)}
              className={`pressable min-h-11 rounded-[var(--radius-control)] text-body font-medium ${radiusMi === r ? "bg-tint text-white" : "bg-fill"}`}
            >
              {r} mi
            </button>
          ))}
        </div>
      </Card>
      {error && <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-group px-4 py-3 text-subhead">{error}</p>}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={signUp}
        className="pressable mt-5 h-[3.25rem] w-full rounded-[0.875rem] bg-tint text-body font-semibold text-white disabled:bg-fill disabled:text-label-3"
      >
        {busy ? "Posting…" : "Post my offer"}
      </button>
      <p className="mt-2 text-footnote text-label-3">You hand out food safely and as described; Fludd shows your offer as written.</p>
    </FoodFrame>
  );
}
