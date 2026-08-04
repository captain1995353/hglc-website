"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

/** Step 1 — ask Supabase to email a recovery link. */
export function ForgotPasswordForm({ t }: { t: Dictionary }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
    );

    if (authError) setError(authError.message);
    else setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <p className="rounded-lg bg-brand-50 px-4 py-4 text-sm text-brand-800">
        {t.auth.resetSent}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>
      )}
      <div>
        <label className="field-label" htmlFor="email">
          {t.auth.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? t.auth.working : t.auth.resetSend}
      </button>
    </form>
  );
}

/** Step 2 — the recovery session is active; set a new password. */
export function NewPasswordForm({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>
      )}
      <div>
        <label className="field-label" htmlFor="password">
          {t.auth.newPassword}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">{t.auth.passwordHint}</p>
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? t.auth.working : t.auth.updatePassword}
      </button>
    </form>
  );
}
