/**
 * Dashboard charts, hand-drawn as inline SVG.
 *
 * Colour follows the job, not the brand: magnitude gets one hue that darkens,
 * state gets a validated status set. The centre's own palette was tested as a
 * categorical set and failed — its navy, indigo and plum sit ΔE 3.6 apart in
 * normal vision, so as separate series they would be unreadable. They stay
 * where they belong: chrome and stat tiles.
 */

/* Status set — passes CVD and normal-vision separation in both modes.
   Contrast against the surface is below 3:1, so every segment is
   direct-labelled; the numbers, not the colour, carry the reading. */
export const STATUS_COLOR = {
  active: "#1baf7a",
  pending_payment: "#eda100",
  completed: "#4c57ab",
  cancelled: "#9aa2e2",
} as const;

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending_payment: "Payment due",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Sequential ramp — one hue, more is darker. */
const RAMP = ["#c0c6ef", "#9aa2e2", "#737ed2", "#5a64c0", "#414b96"];

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-6 ${className}`}>
      <header className="mb-5">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-ink-400">{children}</p>
  );
}

/**
 * Part-to-whole across a handful of states. A horizontal stacked bar rather
 * than a donut: it reads left to right, labels fit beside it, and small
 * slices stay findable.
 */
export function StatusBar({
  data,
}: {
  data: { key: string; value: number }[];
}) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) return <EmptyChart>No enrolments yet.</EmptyChart>;

  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
        {rows.map((row) => (
          <div
            key={row.key}
            title={`${STATUS_LABEL[row.key] ?? row.key}: ${row.value}`}
            style={{
              width: `${(row.value / total) * 100}%`,
              background:
                STATUS_COLOR[row.key as keyof typeof STATUS_COLOR] ?? "#9aa2e2",
            }}
          />
        ))}
      </div>

      <ul className="mt-5 space-y-2.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background:
                  STATUS_COLOR[row.key as keyof typeof STATUS_COLOR] ?? "#9aa2e2",
              }}
            />
            <span className="flex-1 text-ink-600">
              {STATUS_LABEL[row.key] ?? row.key}
            </span>
            <span className="font-semibold text-ink-900">{row.value}</span>
            <span className="w-12 text-right text-xs text-ink-400">
              {Math.round((row.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Magnitude, ranked. Horizontal because course names are long, and one hue
 * darkening with rank because these are the same measure, not separate series.
 */
export function RankedBars({
  data,
  format,
}: {
  data: { label: string; value: number; hint?: string }[];
  format?: (value: number) => string;
}) {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, 8);
  const max = Math.max(...rows.map((r) => r.value), 1);

  if (rows.length === 0 || max === 0) {
    return <EmptyChart>Nothing to show yet.</EmptyChart>;
  }

  return (
    <ul className="space-y-4">
      {rows.map((row, index) => {
        const pct = (row.value / max) * 100;
        const shade = RAMP[Math.min(index, RAMP.length - 1)];

        return (
          <li key={row.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4">
              <span className="truncate text-sm text-ink-700" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink-900">
                {format ? format(row.value) : row.value}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, 2)}%`, background: shade }}
                title={row.hint ?? `${row.label}: ${row.value}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A single measure over time. One series, so no legend — the title names it.
 * Drawn as an area under a 2px line, with the last point marked and labelled.
 */
export function TrendArea({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format?: (value: number) => string;
}) {
  if (data.length < 2) {
    return <EmptyChart>Not enough history yet — check back after a few payments.</EmptyChart>;
  }

  const width = 520;
  const height = 160;
  const padX = 8;
  const padY = 16;

  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - padX * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - d.value / max) * (height - padY * 2),
    ...d,
  }));

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Money collected per month"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#414b96" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#414b96" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive baseline only — no grid competing with the data. */}
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#e5e8f2"
          strokeWidth="1"
        />

        <polygon points={area} fill="url(#trend-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#414b96"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="8" fill="transparent">
            <title>{`${p.label}: ${format ? format(p.value) : p.value}`}</title>
          </circle>
        ))}

        {/* 2px surface ring so the marker reads against the area fill. */}
        <circle cx={last.x} cy={last.y} r="5" fill="#414b96" stroke="#fff" strokeWidth="2" />
      </svg>

      <div className="mt-2 flex justify-between text-xs text-ink-400">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-500">
        Latest:{" "}
        <strong className="font-semibold text-ink-900">
          {format ? format(last.value) : last.value}
        </strong>{" "}
        in {last.label}
      </p>
    </div>
  );
}
