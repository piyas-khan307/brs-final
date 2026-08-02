import type { Metadata } from "next";

import { SessionProvider } from "@/components/admin/Session";
import { AdminShell } from "@/components/admin/Shell";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ADMIN AREA — /admin.
 *
 * A page on the website rather than a second application. That was the
 * club's call and it is the right one: "log in at the website address"
 * is one instruction, where "open a different tool on another port" is a
 * thing to be taught, forgotten, and asked about again next year.
 *
 * ── HOW THIS WORKS UNDER `output: "export"` ──
 * There is no server at request time, so none of this can be rendered
 * per-user. It does not need to be. The admin area is a CLIENT
 * application served as static files: it signs in against Directus from
 * the browser, and every read and write goes to Directus directly, where
 * the permissions configured in apps/cms are enforced.
 *
 * Nothing sensitive is in the bundle — no tokens, no keys, only the URL
 * of a CMS that is already public-facing. The JavaScript here is
 * code-split by route, so a visitor reading the committee page never
 * downloads any of it.
 *
 * ── WHY NOT DIRECTUS'S OWN ADMIN UI ──
 * It is perfectly good, and it presents TABLES. Adding one person to a
 * committee means creating a row in `members`, possibly a row in
 * `committee_sections`, then a row in `memberships` — three screens, in
 * an order nobody guesses. This area exists to turn that into one form
 * headed "Add a member".
 * ══════════════════════════════════════════════════════════════════════
 */

export const metadata: Metadata = {
  title: "Website admin — BUET Robotics Society",
  // An admin panel has no business in search results.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
