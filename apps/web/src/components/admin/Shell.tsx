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
import { useEffect, useState } from "react";

import { useSession } from "./Session";
import { Button, Field, Input, Loading, Notice } from "./ui";

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

/**
 * ══════════════════════════════════════════════════════════════════════
 * SIGNING BACK IN WITHOUT LOSING THE PAGE.
 *
 * A session that ends mid-write used to send you to /admin/login. That is
 * a navigation, a navigation unmounts the editor, and an unmounted editor
 * takes an hour of writing with it. The complaint that produced this was
 * exactly that: upload a picture late in a long write-up, be told to sign
 * in again, and come back to an empty page.
 *
 * So this sits ON TOP of the page instead. The editor underneath keeps
 * every character it had — it is not re-rendered, let alone re-mounted —
 * and dismissing this puts the caret back where it was.
 *
 * It does not offer a way out other than signing in, because there isn't
 * one: nothing can be saved until there is a session again. The escape
 * hatch is the browser's own — the text is still on screen, and it can be
 * copied out of a page this does not cover completely.
 * ══════════════════════════════════════════════════════════════════════
 */
function ReauthPanel({ email: known }: { email: string }) {
  const { signIn } = useSession();
  const [email, setEmail] = useState(known);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // Nothing else to do: `expired` goes false and this unmounts,
      // revealing the page exactly as it was left.
    } catch {
      setError("That email and password do not match an account.");
      setBusy(false);
    }
  }

  return (
    <div
      className="adm-reauth flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-heading"
    >
      <div className="w-full max-w-md border border-line-strong bg-bg-raised p-6 md:p-8">
        <h2
          id="reauth-heading"
          className="text-heading-m text-text-primary"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          Sign in to carry on
        </h2>
        <p className="mt-3 text-body-m text-text-secondary">
          Your session ran out. <strong className="text-text-primary">Nothing you have written
          is lost</strong> — the page is still open behind this. Sign in and it comes straight
          back.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          {error ? <Notice tone="error">{error}</Notice> : null}

          <Field label="Email" required>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password" required>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </Field>

          <Button type="submit" variant="primary" busy={busy} className="w-full">
            Sign in and carry on
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, expired, signOut } = useSession();
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

      {/* Over the page, never instead of it. */}
      {expired ? <ReauthPanel email={user.email} /> : null}

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

