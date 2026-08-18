"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ADMIN PANEL FRAME.
 *
 * Signs you in, keeps you signed in, and shows only the things you are
 * allowed to do.
 *
 * ── WHY THE MENU IS SHORT ──
 * Directus's own sidebar lists every table. This one lists JOBS: "Blog
 * posts", "Committee", "Photographs". A club secretary does not think in
 * tables, and the gap between "committee_sections" and "the thing I want
 * to change" is exactly where people give up and email the webmaster.
 *
 * A Member sees three entries. An Administrator sees all of them. That is
 * a presentation decision — every restriction is enforced by Directus, and
 * is tested in apps/cms/test/permissions.test.mjs.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "./Session";
import { Button, Loading } from "./ui";

/* The one-line descriptions under each label are GONE. They were there
   to teach the menu on a first visit, and a menu of nine entries that
   each carry a second line is a wall of text you re-read every time —
   the label alone ("Photographs", "Accounts") already says it, so the
   subtitle was paying rent on nine rows to explain nothing. */
type Entry = { href: string; label: string; adminOnly?: boolean };

const NAV: Entry[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Blog posts" },
  { href: "/admin/photos", label: "Photographs" },
  { href: "/admin/committee", label: "Committee", adminOnly: true },
  { href: "/admin/people", label: "People", adminOnly: true },
  { href: "/admin/events", label: "Events", adminOnly: true },
  { href: "/admin/achievements", label: "Achievements", adminOnly: true },
  { href: "/admin/partners", label: "Partners & press", adminOnly: true },
  { href: "/admin/accounts", label: "Accounts", adminOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const onLoginPage = pathname?.startsWith("/admin/login") ?? false;

  // Bounce to the login page only once the session check has SETTLED.
  // Redirecting while `loading` is true would log everyone out on every
  // page refresh, because the access token starts in memory and empty.
  useEffect(() => {
    if (loading || user || onLoginPage) return;
    /* Carry where they were, so signing back in after a session times out
       returns them to the event they had open rather than to the panel's
       front page. Read from `window` rather than useSearchParams(), which
       would force a Suspense boundary around every admin page under
       `output: "export"`. */
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(`/admin/login/?next=${encodeURIComponent(here)}`);
  }, [loading, user, onLoginPage, router]);

  if (onLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24">
        <Loading what="your session" />
      </div>
    );
  }

  if (!user) {
    // The redirect above is already running; this is the one frame in
    // between, and a blank screen with no explanation is how a user
    // decides the tool is broken.
    return (
      <div className="mx-auto max-w-shell px-6 py-24">
        <p className="text-body-m text-text-secondary">
          Taking you to the sign-in page…{" "}
          <Link href="/admin/login/" className="text-accent underline">
            Go there now
          </Link>
        </p>
      </div>
    );
  }

  const visible = NAV.filter((e) => !e.adminOnly || user.isAdministrator);
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="sticky top-0 z-40 border-b border-line-hairline bg-bg-raised">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="text-heading-m font-bold text-text-primary"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              BRS
            </span>
            <span className="h-4 w-px bg-line-hairline" />
            <span className="font-mono text-micro uppercase tracking-widest text-text-tertiary">
              Website Control
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-line-hairline bg-bg-base px-3 py-1">
              <span className="h-2 w-2 bg-success" />
              <span className="text-body-s font-medium text-text-primary">{name}</span>
              <span className="border border-line-hairline px-1.5 py-0.5 font-mono text-micro uppercase text-accent">
                {user.isAdministrator ? "Admin" : "Member"}
              </span>
            </div>

            <Link
              href="/"
              target="_blank"
              className="text-body-s text-text-secondary underline decoration-line-strong underline-offset-4 hover:text-text-primary"
            >
              View site
            </Link>

            <Button
              variant="quiet"
              onClick={async () => {
                await signOut();
                router.replace("/admin/login/");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-shell flex-col gap-8 px-6 py-8 md:flex-row md:gap-10 md:py-10">
        <nav aria-label="Admin sections" className="md:sticky md:top-24 md:w-64 md:shrink-0 md:self-start">
          <ul className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
            {visible.map((e) => {
              const active =
                e.href === "/admin"
                  ? pathname === "/admin/" || pathname === "/admin"
                  : pathname?.startsWith(e.href);
              return (
                <li key={e.href}>
                  <Link
                    href={`${e.href}/`}
                    aria-current={active ? "page" : undefined}
                    className={`block border-l-2 px-4 py-2.5 no-underline transition-colors duration-micro ease-out ${
                      active
                        ? "border-accent bg-bg-raised text-text-primary"
                        : "border-transparent text-text-secondary hover:border-line-strong hover:bg-bg-raised hover:text-text-primary"
                    }`}
                  >
                    <span
                      className="block text-body-m font-medium"
                      style={{ fontVariationSettings: active ? "'wght' 620" : "'wght' 500" }}
                    >
                      {e.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );

}

