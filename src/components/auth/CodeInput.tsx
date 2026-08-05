"use client";

/**
 * Six-digit code field. Kept as one input rather than six boxes so that
 * pasting the code from an email — the way most people do it — just works,
 * and so screen readers announce a single labelled field.
 */
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
        maxLength={6}
        required
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className="field-input text-center font-mono text-2xl tracking-[0.4em]"
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
