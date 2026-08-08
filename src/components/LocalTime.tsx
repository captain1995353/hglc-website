"use client";

/**
 * Renders a timestamp in the reader's own timezone.
 *
 * Server components format dates in the server's zone, which is UTC — so a
 * class at 7pm Dhaka time was being shown to staff as 13:00. This defers the
 * formatting to the browser.
 */
export function LocalTime({
  iso,
  withTime = true,
}: {
  iso: string | null | undefined;
  withTime?: boolean;
}) {
  if (!iso) return <>—</>;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>—</>;

  const text = withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  // suppressHydrationWarning: the server renders this in UTC and the browser
  // immediately corrects it; the mismatch is the whole point.
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
