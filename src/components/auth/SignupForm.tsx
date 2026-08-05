"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CodeInput, MIN_CODE_LENGTH } from "./CodeInput";
import type { Dictionary } from "@/lib/i18n";

/**
 * Two steps: create the account with a password, then confirm the email
 * address with the code Supabase emails. The code path is used
 * instead of a confirmation link so students can finish signing up on the
 * same device and tab they started on.
 */
export function SignupForm({ t, next }: { t: Dictionary; next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onCreateAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.full_name.trim(), phone: form.phone.trim() },
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    // Email confirmation off would hand us a session straight away.
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }

    setStep("code");
    setBusy(false);
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: form.email.trim(),
      token: code,
      type: "signup",
    });

    if (verifyError) {
      setError(t.auth.codeInvalid);
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: form.email.trim(),
    });

    if (resendError) setError(resendError.message);
    else setNotice(t.auth.resent);
    setBusy(false);
  }

  if (step === "code") {
    return (
      <form onSubmit={onVerify} className="space-y-4">
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {t.auth.checkEmailBody.replace("{email}", form.email.trim())}
        </div>

        {error && (
          <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-600">
            {notice}
          </p>
        )}

        <CodeInput
          value={code}
          onChange={setCode}
          label={t.auth.code}
          hint={t.auth.codeHint}
        />

        <button
          type="submit"
          disabled={busy || code.length < MIN_CODE_LENGTH}
          className="btn btn-primary w-full"
        >
          {busy ? t.auth.working : t.auth.verify}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={busy}
          className="btn btn-ghost w-full text-sm"
        >
          {t.auth.resend}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onCreateAccount} className="space-y-4">
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
