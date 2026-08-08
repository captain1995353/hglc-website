"use client";

import { useState } from "react";

/**
 * A `datetime-local` input gives a wall-clock string with no timezone. Parsing
 * that on the server — which runs in UTC — silently shifts it by the user's
 * offset: 21:00 typed in Seoul became 21:00 UTC, nine hours late.
 *
 * So the visible input stays local, and a hidden field carries the real
 * instant as ISO, computed in the browser where "local" actually means the
 * user's own clock.
 */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string) {
  if (!local) return "";
  const date = new Date(local); // parsed in the browser's zone — what we want
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function DateTimeField({
  label,
  name,
  defaultValue,
  hint,
  required,
  className = "",
}: {
  label: string;
  name: string;
  /** ISO string from the database, or empty for a new record. */
  defaultValue?: string | null;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState(() => toLocalInput(defaultValue));

  const zone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "";

  return (
    <div className={className}>
      <label className="field-label" htmlFor={`${name}_local`}>
        {label}
        {required && <span className="ml-0.5 text-coral-500">*</span>}
      </label>

      <input
        id={`${name}_local`}
        type="datetime-local"
        required={required}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="field-input"
      />
      <input type="hidden" name={name} value={toIso(local)} />

      <p className="mt-1 text-xs text-ink-400">
        {hint ? `${hint} ` : ""}
        {zone ? `Times are in your local timezone (${zone}).` : ""}
      </p>
    </div>
  );
}
