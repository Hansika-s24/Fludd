"use client";

import { useState, type FormEvent } from "react";
import { Group } from "@/components/ui/surface";
import { adminSignIn } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { isAdmin } = await adminSignIn(email.trim(), password);
      if (isAdmin) {
        onSignedIn();
        return;
      }
      setError("Not an admin. Check the email and password, or ask for admin access.");
    } catch {
      setError("Sign-in failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Group title="Sign in">
        <label className="flex min-h-11 items-center gap-3 border-b border-separator px-4">
          <span className="w-20 shrink-0 text-subhead">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-label-3"
            placeholder="name@usf.edu"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 px-4">
          <span className="w-20 shrink-0 text-subhead">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-subhead outline-none"
          />
        </label>
      </Group>

      {error && (
        <p role="alert" className="px-7 pt-2 text-footnote text-late">
          {error}
        </p>
      )}
      {!isSupabaseConfigured() && (
        <p className="px-7 pt-2 text-footnote text-label-2">Supabase is not set up on this server, so nobody can sign in.</p>
      )}

      <div className="px-4 pt-4">
        <button
          type="submit"
          disabled={busy || email.trim() === "" || password === ""}
          className="pressable min-h-11 w-full rounded-[var(--radius-control)] bg-tint px-4 text-headline font-semibold text-white active:bg-tint-pressed disabled:opacity-40"
        >
          {busy ? "Signing in" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
