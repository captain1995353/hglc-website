/**
 * Thin strip shown when Supabase env vars are missing. The catalogue renders
 * from `src/lib/demo-data.ts` in that state; accounts and payments are off.
 */
export function DemoBanner() {
  return (
    <div className="bg-coral-500 text-white">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs sm:text-sm">
        <span className="font-semibold">Preview mode</span>
        <span className="text-white/85">
          Course content is sample data. Add your Supabase keys to{" "}
          <code className="rounded bg-white/15 px-1 py-0.5 font-mono">.env.local</code>{" "}
          to switch on accounts, enrolment and payments — see{" "}
          <code className="rounded bg-white/15 px-1 py-0.5 font-mono">README.md</code>.
        </span>
      </div>
    </div>
  );
}
