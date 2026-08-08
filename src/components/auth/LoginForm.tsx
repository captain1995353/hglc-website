"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

/**
 * Staff accounts sign in with a short name rather than an address, so an
 * entry with no "@" is resolved against the centre's own domain: `admin`
 * becomes `admin@hangeulglobal.com`. Students type their real email and are
 * unaffected.
 */
const STAFF_DOMAIN = "hangeulglobal.com";

function toEmail(identifier: string) {
  const value = identifier.trim();
  return value.includes("@") ? value : `${value.toLowerCase()}@${STAFF_DOMAIN}`;
}

export function LoginForm({ t, next }: { t: Dictionary; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: toEmail(email),
      password,
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>
      )}

      <div>
        <label className="field-label" htmlFor="email">
          {t.auth.identifier}
        </label>
        <input
          id="email"
          type="text"
          required
          autoComplete="username"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="field-label" htmlFor="password">
            {t.auth.password}
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            {t.auth.forgot}
          </Link>
        </div>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? t.auth.working : t.auth.login}
      </button>
    </form>
  );
}
