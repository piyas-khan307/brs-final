import Link from "next/link";

/**
 * MASTHEAD — §4.3.
 *
 * Server Component; zero client JS. The 72→56px collapse specified in §4.3
 * is deliberately NOT implemented as an island: it would cost a scroll
 * listener for a cosmetic effect, against a 15 KB first-party budget. A
 * static height with a permanent hairline base achieves the same visual
 * discipline. Revisit only if the Gate review asks for it.
 *
 * "Apply" is distinguished by a 1px hairline box, never a filled pill —
 * pill CTAs are SaaS furniture (§17.1).
 */

const NAV = [
  { label: "Record", href: "/achievements" },
  { label: "Events", href: "/events" },
  { label: "Committee", href: "/executive-committee" },
  { label: "Explore", href: "/explore" },
];

export function Masthead() {
  return (
    // Fully opaque. A translucent header would need backdrop-blur to read
    // cleanly, and blur is banned (§3.3). Opacity here is also the more
    // precise choice: the hairline base is the only separation needed.
    <header className="sticky top-0 z-50 border-b border-line-hairline bg-bg-base">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-6 md:px-16">
        <Link
          href="/"
          className="flex items-baseline gap-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          <span
            className="text-heading-s text-text-primary"
            style={{ fontVariationSettings: "'wght' 600" }}
          >
            BRS
          </span>
          <span className="hidden font-mono text-micro uppercase text-text-tertiary sm:inline">
            BUET Robotics Society
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-mono text-micro uppercase text-text-secondary no-underline transition-colors duration-micro ease-out hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/explore/join"
            className="border border-line-strong px-4 py-2 font-mono text-micro uppercase text-text-primary no-underline transition-colors duration-micro ease-out hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          >
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}
