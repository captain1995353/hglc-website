/** Stands in for the auth forms while Supabase is not connected. */
export function PreviewAuthNotice() {
  return (
    <div className="rounded-lg bg-paper-dim px-5 py-6 text-sm leading-relaxed text-ink-600">
      <p className="font-semibold text-ink-900">Accounts are off in preview mode</p>
      <p className="mt-2">
        Sign-up, log-in, enrolment and payment need a Supabase project. Run{" "}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
          supabase/schema.sql
        </code>{" "}
        and{" "}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
          supabase/seed.sql
        </code>
        , then add your keys to{" "}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">.env.local</code>{" "}
        and restart the server.
      </p>
    </div>
  );
}
