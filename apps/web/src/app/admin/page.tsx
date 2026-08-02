"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * OVERVIEW — the first screen after signing in.
 *
 * Not a dashboard of counts. Counts are trivia; this answers one
 * question, which is "is there anything waiting for me?"
 *
 * For an Administrator that is mostly the approval queue: a Member has
 * written something and it cannot go live until somebody reads it. If
 * that sits unseen for a fortnight, the approval step has quietly become
 * a way of never publishing anything.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/components/admin/Session";
import { Card, Empty, Loading, Notice } from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

type PostRow = {
  id: string;
  title: string;
  review_state: string;
  published: boolean;
  author_name: string | null;
};

export default function Overview() {
  const { user } = useSession();
  const [awaiting, setAwaiting] = useState<PostRow[] | null>(null);
  const [mine, setMine] = useState<PostRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (user.isAdministrator) {
          setAwaiting(
            await items.list<PostRow>("posts", {
              "filter[review_state][_eq]": "submitted",
              fields: "id,title,review_state,published,author_name",
              sort: "title",
              limit: 50,
            }),
          );
        }
        // A Member's own posts; for an Administrator this is the same
        // query and simply returns everything they have written.
        setMine(
          await items.list<PostRow>("posts", {
            fields: "id,title,review_state,published,author_name",
            sort: "-published_at",
            limit: 10,
          }),
        );
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [user]);

  if (!user) return null;

  const firstName = user.first_name?.trim();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-l text-text-primary" style={{ fontVariationSettings: "'wght' 600" }}>
          {firstName ? `Hello, ${firstName}` : "Hello"}
        </h1>
        <p className="mt-2 max-w-prose text-body-m text-text-secondary">
          {user.isAdministrator
            ? "You can change anything on the website from here."
            : "You can write blog posts here. An Administrator reads them before they go live."}
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {user.isAdministrator ? (
        <section>
          <h2 className="text-heading-m text-text-primary" style={{ fontVariationSettings: "'wght' 550" }}>
            Waiting for your approval
          </h2>
          <div className="mt-4">
            {awaiting === null ? (
              <Loading what="the approval queue" />
            ) : awaiting.length === 0 ? (
              <Empty>Nothing is waiting. Members&rsquo; posts will appear here when submitted.</Empty>
            ) : (
              <ul className="space-y-3">
                {awaiting.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/posts/edit/?id=${p.id}`} className="block no-underline">
                      <Card className="transition-colors duration-micro ease-out hover:border-line-strong">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <span
                            className="text-body-l text-text-primary"
                            style={{ fontVariationSettings: "'wght' 550" }}
                          >
                            {p.title}
                          </span>
                          <span className="font-mono text-micro uppercase text-accent">Review</span>
                        </div>
                        {p.author_name ? (
                          <p className="mt-1 text-body-s text-text-secondary">by {p.author_name}</p>
                        ) : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-heading-m text-text-primary" style={{ fontVariationSettings: "'wght' 550" }}>
          {user.isAdministrator ? "Recent posts" : "Your posts"}
        </h2>
        <div className="mt-4">
          {mine === null ? (
            <Loading what="your posts" />
          ) : mine.length === 0 ? (
            <Empty>
              You have not written anything yet.{" "}
              <Link href="/admin/posts/edit/" className="text-accent underline">
                Write your first post
              </Link>
              .
            </Empty>
          ) : (
            <ul className="space-y-2">
              {mine.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/posts/edit/?id=${p.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-3 border border-line-hairline bg-bg-raised px-4 py-3 no-underline transition-colors duration-micro ease-out hover:border-line-strong"
                  >
                    <span className="text-body-m text-text-primary">{p.title}</span>
                    <StateBadge published={p.published} state={p.review_state} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/** The status in words a person uses, not the database's four values. */
export function StateBadge({ published, state }: { published: boolean; state: string }) {
  const label = published
    ? "Live on the site"
    : state === "approved"
      ? "Approved — not yet live"
      : state === "submitted"
        ? "Waiting for approval"
        : state === "changes_requested"
          ? "Changes requested"
          : "Draft";
  const tone =
    published || state === "approved"
      ? "text-success"
      : state === "changes_requested"
        ? "text-accent"
        : "text-text-tertiary";
  return <span className={`font-mono text-micro uppercase ${tone}`}>{label}</span>;
}
