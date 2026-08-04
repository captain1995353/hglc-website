/**
 * The HGLC puzzle mark, redrawn as inline SVG so it stays sharp at every size
 * and sits on any background (the supplied JPEG carries a white box).
 * Four interlocking tiles — H G L C — in the brand's coral, navy, indigo
 * and plum.
 */
export function LogoMark({
  className = "h-10 w-10",
  title,
  onDark = false,
}: {
  className?: string;
  title?: string;
  /** Lifts the navy tile so it still separates on a dark background. */
  onDark?: boolean;
}) {
  const navy = onDark ? "#4a5686" : "#24315e";

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}

      {/* Tiles: top-left coral, top-right navy, bottom-left indigo,
          bottom-right plum. Outer corners rounded, inner corners square. */}
      <path
        fill="#e94b4f"
        d="M8 15a7 7 0 0 1 7-7h34v41H8z"
      />
      <path
        fill={navy}
        d="M51 8h34a7 7 0 0 1 7 7v34H51z"
      />
      <path
        fill="#4c57ab"
        d="M8 51h41v41H15a7 7 0 0 1-7-7z"
      />
      <path
        fill="#61539f"
        d="M51 51h41v34a7 7 0 0 1-7 7H51z"
      />

      {/* Puzzle tabs straddling the seams, in the colour of the piece they
          belong to — this is what makes the four tiles read as interlocking. */}
      <circle cx="50" cy="28" r="7.5" fill={navy} />
      <circle cx="28" cy="50" r="7.5" fill="#e94b4f" />
      <circle cx="72" cy="50" r="7.5" fill={navy} />
      <circle cx="50" cy="72" r="7.5" fill="#4c57ab" />

      {/* Letters */}
      <g
        fill="#ffffff"
        fontFamily="ui-sans-serif, system-ui, 'Segoe UI', Arial, sans-serif"
        fontWeight="700"
        fontSize="26"
        textAnchor="middle"
      >
        <text x="29" y="38">H</text>
        <text x="71" y="38">G</text>
        <text x="29" y="82">L</text>
        <text x="71" y="82">C</text>
      </g>
    </svg>
  );
}
