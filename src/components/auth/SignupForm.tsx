"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

export function SignupForm({ t, next }: { t: Dictionary; next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.full_name.trim(), phone: form.phone.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    // With email confirmation on, Supabase returns a user but no session.
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }

    setNeedsConfirm(true);
    setBusy(false);
  }

  if (needsConfirm) {
    return (
      <div className="rounded-lg bg-brand-50 px-5 py-6 text-center">
        <h2 className="text-base font-bold text-brand-800">{t.auth.checkEmail}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          {t.auth.checkEmailBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>
      )}

      <div>
        <label className="field-label" htmlFor="full_name">
          {t.auth.fullName}
        </label>
        <input
          id="full_name"
          required
          autoComplete="name"
          className="field-input"
          value={form.full_name}
          onChange={update("full_name")}
        />
      </div>

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
          value={form.email}
          onChange={update("email")}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="phone">
          {t.auth.phone}
        </label>
        <input
          id="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          className="field-input"
          value={form.phone}
          onChange={update("phone")}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
          value={form.password}
          onChange={update("password")}
        />
        <p className="mt-1 text-xs text-ink-400">{t.auth.passwordHint}</p>
      </div>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? t.auth.working : t.auth.signup}
      </button>
    </form>
  );
}
