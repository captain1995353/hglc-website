import Link from "next/link";
import { LogoMark } from "./LogoMark";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <LogoMark
        className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105"
        title="Hangeul Global Learning Center"
        onDark={inverted}
      />
      <span className="leading-none">
        <span
          className={`block text-[1.05rem] font-bold uppercase tracking-[0.02em] ${
            inverted ? "text-white" : "text-ink-800"
          }`}
        >
          Hangeul
        </span>
        <span
          className={`mt-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${
            inverted ? "text-ink-200" : "text-ink-400"
          }`}
        >
          Global Learning Center
        </span>
      </span>
    </Link>
  );
}
