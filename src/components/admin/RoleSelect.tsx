"use client";

import { useState } from "react";
import { setStaffRole } from "@/app/actions/admin/staff";

const OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "staff", label: "Staff" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student (no access)" },
];

const TONE: Record<string, string> = {
  admin: "bg-brand-50 text-brand-700",
  staff: "bg-plum-50 text-plum-700",
  teacher: "bg-coral-50 text-coral-700",
  student: "bg-ink-100 text-ink-500",
};

/**
 * Changing someone's role is destructive enough to deserve friction: the
 * current role is shown as text, the button stays disabled until the
 * selection actually differs, and the change is confirmed by name.
 */
export function RoleSelect({
  id,
  name,
  role,
  disabled = false,
}: {
  id: string;
  name: string;
  role: string;
  disabled?: boolean;
}) {
  const [choice, setChoice] = useState(role);
  const changed = choice !== role;

  const current = OPTIONS.find((o) => o.value === role);

  if (disabled) {
    return (
      <span className={`badge ${TONE[role] ?? "bg-ink-100 text-ink-600"}`}>
        {current?.label ?? role}
      </span>
    );
  }

  return (
    <form
      action={setStaffRole}
      onSubmit={(event) => {
        const label = OPTIONS.find((o) => o.value === choice)?.label ?? choice;
        if (!confirm(`Change ${name || "this account"} to ${label}?`)) {
          event.preventDefault();
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />

      <span className={`badge ${TONE[role] ?? "bg-ink-100 text-ink-600"}`}>
        {current?.label ?? role}
      </span>

      <select
        name="role"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label={`Role for ${name}`}
        className="field-input py-1.5 text-xs"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!changed}
        className="btn btn-outline px-3 py-1.5 text-xs disabled:opacity-40"
      >
        Change
      </button>
    </form>
  );
}
