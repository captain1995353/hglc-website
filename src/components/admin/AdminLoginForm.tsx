"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/staff-usernames";

type Choice = "admin" | "teacher" | "staff";

const TABS: { value: Choice; label: string; blurb: string }[] = [
  { value: "admin", label: "Admin", blurb: "Full access to the centre." },
  { value: "teacher", label: "Teacher", blurb: "Your classes and student lists." },
  { value: "staff", label: "Staff", blurb: "Enrolments, payments and enquiries." },
];

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>("admin");
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
      email: usernameToEmail(username),
      password,
    });

    if (authError || !data.user) {
      setError("Wrong username or password.");
      setBusy(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    const role =
      (profile?.role as Choice | "student" | undefined) ??
      (profile?.is_admin ? "admin" : "student");

    // Signing out again is friendlier than letting the dashboard guard bounce
    // someone around after they thought they were in.
    if (role === "student") {
      await supabase.auth.signOut();
      setError("That account does not have dashboard access.");
      setBusy(false);
      return;
    }

    if (role !== choice) {
      await supabase.auth.signOut();
      const actual = TABS.find((tab) => tab.value === role)?.label ?? role;
      setError(`That is a ${actual} account — choose ${actual} above.`);
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <div
          role="tablist"
          aria-label="Account type"
          className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1"
        >
          {TABS.map((tab) => {
            const active = tab.value === choice;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setChoice(tab.value);
                  setError(null);
                }}
                className={`rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white text-ink-900"
                    : "text-ink-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs text-ink-400">
          {TABS.find((tab) => tab.value === choice)?.blurb}
        </p>
      </div>

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
          placeholder={choice}
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
