import Link from "next/link";

/**
 * INDEXED ACTION — the replacement for a button. §4.4.
 *
 * The discarded prototype used a filled cyan-gradient CTA beside a ghost
 * button with a shield icon. Both are SaaS furniture. This is a numbered
 * hairline row that reads like an index entry in a technical document:
 *
 *   01 ── THE RECORD                    →
 *
 * On hover the hairline draws left-to-right and the arrow advances 4px.
 * No fill, no radius, no gradient, no icon library.
 */

export function Arrow({ className = "" }: { className?: string }) {
  // Drawn on a 24px grid rather than pulled from Lucide/Heroicons. A library
  // default arrow is a recognisable stamp; this one belongs to the page.
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path d="M3 12h17" />
      <path d="M14 6l6 6-6 6" />
    </svg>
  );
}

type IndexedActionProps = {
  index: number;
  label: string;
  href: string;
  note?: string;
};

export function IndexedAction({ index, label, href, note }: IndexedActionProps) {
  return (
    <Link
      href={href}
      className="group relative block border-t border-line-hairline py-6 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
    >
      <span className="flex items-baseline gap-6">
        <span className="font-mono text-micro uppercase text-text-tertiary tabular">
          {String(index).padStart(2, "0")}
        </span>
        <span className="text-heading-s text-text-primary transition-colors duration-micro ease-out group-hover:text-accent">
          {label}
        </span>
        {note ? (
          <span className="ml-auto hidden font-mono text-micro uppercase text-text-tertiary sm:block">
            {note}
          </span>
        ) : null}
        <Arrow className="ml-4 shrink-0 self-center text-text-tertiary transition-all duration-base ease-out group-hover:translate-x-1 group-hover:text-accent" />
      </span>

      {/* The hairline draw — the site's one flourish, and it is 1px. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-large ease-out group-hover:scale-x-100 motion-reduce:transition-none"
      />
    </Link>
  );
}
