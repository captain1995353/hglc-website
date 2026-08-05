"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CodeInput, MIN_CODE_LENGTH } from "./CodeInput";
import type { Dictionary } from "@/lib/i18n";

/**
 * Password reset in three steps on one screen: ask for the email, confirm the
 * emailed code, then set the new password. Verifying the code returns a
 * session, which is what allows updateUser to change the password.
 */
export function ForgotPasswordForm({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
    );

    if (authError) {
      setError(authError.message);
      setBusy(false);
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
      email: email.trim(),
      token: code,
      type: "recovery",
    });

    if (verifyError) {
      setError(t.auth.codeInvalid);
      setBusy(false);
      return;
    }

    setStep("password");
    setBusy(false);
  }

  async function onSetPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  const problem = error && (
    <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>
  );

  if (step === "code") {
    return (
      <form onSubmit={onVerify} className="space-y-4">
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {t.auth.resetCodeBody.replace("{email}", email.trim())}
        </div>

        {problem}
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
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const supabase = createClient();
            const { error: resendError } =
              await supabase.auth.resetPasswordForEmail(email.trim());
            if (resendError) setError(resendError.message);
            else setNotice(t.auth.resent);
            setBusy(false);
          }}
          className="btn btn-ghost w-full text-sm"
        >
          {t.auth.resend}
        </button>
      </form>
    );
  }

  if (step === "password") {
    return (
      <form onSubmit={onSetPassword} className="space-y-4">
        {problem}
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

  return (
    <form onSubmit={onSendCode} className="space-y-4">
      {problem}
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

/** Kept for the /reset-password route, reached with a live recovery session. */
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
