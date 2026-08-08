import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Receipts live in a private bucket, so the dashboard links to them through a
 * short-lived signed URL rather than a public path.
 */
export async function ReceiptLink({ path }: { path: string | null }) {
  if (!path) {
    return <span className="text-xs text-ink-400">No receipt attached</span>;
  }

  const db = createAdminClient();
  const { data } = await db.storage.from("receipts").createSignedUrl(path, 60 * 30);

  if (!data?.signedUrl) {
    return <span className="text-xs text-coral-600">Receipt could not be loaded</span>;
  }

  const isPdf = path.toLowerCase().endsWith(".pdf");

  return (
    <a
      href={data.signedUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-block"
    >
      {isPdf ? (
        <span className="btn btn-outline px-3 py-1.5 text-xs">Open receipt (PDF) ↗</span>
      ) : (
        /* A signed URL expires in 30 minutes, so next/image has nothing stable
           to cache or optimise — a plain img is the honest choice here. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.signedUrl}
          alt="Payment receipt"
          className="max-h-56 rounded-lg border border-ink-200 object-contain"
        />
      )}
    </a>
  );
}
