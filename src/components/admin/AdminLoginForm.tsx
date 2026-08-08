"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff sign in with a short username. Supabase authenticates by email, so an
 * entry without "@" is resolved against the centre's domain — `admin` becomes
 * admin@hangeulglobal.com.
 */
const STAFF_DOMAIN = "hangeulglobal.com";

function toEmail(identifier: string) {
  const value = identifier.trim();
  return value.includes("@") ? value : `${value.toLowerCase()}@${STAFF_DOMAIN}`;
}

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });

    if (authError || !data.user) {
      setError("Wrong username or password.");
      setBusy(false);
      return;
    }

    // A student who finds this page gets signed straight back out rather than
    // being bounced around by the dashboard guard.
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setError("That account does not have dashboard access.");
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-coral-500/15 px-4 py-3 text-sm text-coral-200">
          {error}
        </p>
      )}

      <div>
        <label
          className="mb-1.5 block text-sm font-semibold text-ink-200"
          htmlFor="username"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          autoComplete="username"
          autoFocus
          placeholder="admin"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-white placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-sm font-semibold text-ink-200"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-white focus:border-brand-400 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
