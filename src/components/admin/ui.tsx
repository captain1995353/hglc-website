import Link from "next/link";

/** Page heading with an optional action on the right. */
export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Green/red strip driven by ?saved=1 / ?error=… query params. */
export function FlashMessage({
  saved,
  error,
  savedText = "Saved.",
  messages = {},
}: {
  saved?: string;
  error?: string;
  savedText?: string;
  messages?: Record<string, string>;
}) {
  if (saved) {
    return (
      <p className="mb-6 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
        {savedText}
      </p>
    );
  }
  if (error) {
    return (
      <p className="mb-6 rounded-lg bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">
        {messages[error] ?? "Something went wrong. Please try again."}
      </p>
    );
  }
  return null;
}

export function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-6 p-6">
      {title && (
        <header className="mb-5">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-ink-500">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  hint,
  type = "text",
  required,
  placeholder,
  step,
  min,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  hint?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-coral-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="field-input"
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  hint,
  rows = 4,
  placeholder,
  required,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-coral-500">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="field-input resize-y"
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  hint,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="field-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-white p-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-[#414b96]"
      />
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-400">{hint}</span>}
      </span>
    </label>
  );
}

const TONES: Record<string, string> = {
  paid: "bg-brand-50 text-brand-700",
  active: "bg-brand-50 text-brand-700",
  completed: "bg-plum-50 text-plum-700",
  pending_review: "bg-coral-50 text-coral-700",
  pending_payment: "bg-coral-50 text-coral-700",
  initiated: "bg-ink-100 text-ink-500",
  failed: "bg-coral-50 text-coral-700",
  cancelled: "bg-ink-100 text-ink-500",
  refunded: "bg-plum-50 text-plum-700",
  yes: "bg-brand-50 text-brand-700",
  no: "bg-ink-100 text-ink-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${TONES[status] ?? "bg-ink-100 text-ink-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="card p-8 text-center text-sm text-ink-500">{children}</p>
  );
}

export function TableShell({
  head,
  children,
  minWidth = "44rem",
}: {
  head: string[];
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            {head.map((cell) => (
              <th key={cell} className="px-5 py-3 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-block text-sm font-medium text-ink-400 hover:text-ink-700"
    >
      ← {children}
    </Link>
  );
}
