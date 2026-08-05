"use client";

/**
 * Verification code field. One input rather than a row of boxes so pasting
 * the code out of an email just works, and so screen readers announce a
 * single labelled field.
 *
 * Length is not fixed: Supabase's OTP length is configurable (6–10), so the
 * field accepts up to 10 digits and the form enables submit from 6 onwards.
 * That way changing the setting never breaks the page.
 */
export const MIN_CODE_LENGTH = 6;
export const MAX_CODE_LENGTH = 10;

export function CodeInput({
  value,
  onChange,
  label,
  hint,
  id = "code",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  id?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={MAX_CODE_LENGTH}
        required
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH))
        }
        placeholder="000000"
        className="field-input text-center font-mono text-2xl tracking-[0.3em]"
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
