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

type Entry = { href: string; label: string; hint: string; adminOnly?: boolean };

const NAV: Entry[] = [
  { href: "/admin", label: "Overview", hint: "What needs your attention" },
  { href: "/admin/posts", label: "Blog posts", hint: "Write and publish articles" },
  { href: "/admin/photos", label: "Photographs", hint: "Upload and describe images" },
  { href: "/admin/committee", label: "Committee", hint: "Sections, positions and members", adminOnly: true },
  { href: "/admin/people", label: "People", hint: "Everyone on record", adminOnly: true },
  { href: "/admin/events", label: "Events", hint: "Workshops and competitions", adminOnly: true },
  { href: "/admin/achievements", label: "Achievements", hint: "Competition results", adminOnly: true },
  { href: "/admin/partners", label: "Partners & press", hint: "Sponsors and coverage", adminOnly: true },
  { href: "/admin/accounts", label: "Accounts", hint: "Who can sign in", adminOnly: true },
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
    if (!loading && !user && !onLoginPage) router.replace("/admin/login/");
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
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-line-hairline bg-bg-raised">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span
              className="text-heading-m text-text-primary"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              BRS
            </span>
            <span className="font-mono text-micro uppercase text-text-tertiary">Website admin</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-body-m text-text-secondary">
              {name}
              {/* The role, in the placard voice. It is a fact about the
                  session rather than part of the person's name, and the
                  mono register says so without a coloured badge. */}
              <span className="ml-2 font-mono text-micro uppercase text-text-tertiary">
                {user.isAdministrator ? "Administrator" : "Member"}
              </span>
            </span>
            {/* A link out to the real site, because the whole point of
                editing is to go and look at the result. */}
            <Link
              href="/"
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

      <div className="mx-auto flex max-w-shell flex-col gap-8 px-6 py-8 md:flex-row md:gap-12 md:py-12">
        <nav aria-label="Admin sections" className="md:w-64 md:shrink-0">
          <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
            {visible.map((e) => {
              // `/admin` would otherwise match every child route.
              const active = e.href === "/admin" ? pathname === "/admin/" || pathname === "/admin" : pathname?.startsWith(e.href);
              return (
                <li key={e.href}>
                  <Link
                    href={`${e.href}/`}
                    aria-current={active ? "page" : undefined}
                    // The left rule is the whole navigation device: it is
                    // the site's own structural hairline, thickened to 2px
                    // and coloured oxblood for the page you are on. No
                    // pill, no fill, no icon set.
                    className={`block border-l-2 px-4 py-2.5 no-underline transition-colors duration-micro ease-out ${
                      active
                        ? "border-accent bg-bg-raised text-text-primary"
                        : "border-transparent text-text-secondary hover:border-line-strong hover:bg-bg-raised hover:text-text-primary"
                    }`}
                  >
                    <span
                      className="block text-body-l"
                      style={{ fontVariationSettings: active ? "'wght' 620" : "'wght' 500" }}
                    >
                      {e.label}
                    </span>
                    <span className="mt-0.5 hidden text-body-s text-text-tertiary md:block">{e.hint}</span>
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
