"use client";

/** Blog posts. A Member sees only their own — Directus filters the rows,
 *  not this list. */

import Link from "next/link";
import { useEffect, useState } from "react";

import { StateBadge } from "@/app/admin/page";
import { useSession } from "@/components/admin/Session";
import { Button, Empty, Loading, Notice, PageHeader } from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

type Row = {
  id: string;
  title: string;
  review_state: string;
  published: boolean;
  author_name: string | null;
  published_at: string | null;
};

export default function PostsPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    items
      .list<Row>("posts", {
        fields: "id,title,review_state,published,author_name,published_at",
        sort: "-published_at",
        limit: 200,
      })
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog posts"
        description={
          user?.isAdministrator
            ? "Everything written by anyone. Posts marked “Waiting for approval” need you."
            : "Your posts. Submit one for review when it is ready and an Administrator will publish it."
        }
        action={
          <Link href="/admin/posts/edit/">
            <Button variant="primary">Write a post</Button>
          </Link>
        }
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {rows === null ? (
        <Loading what="posts" />
      ) : rows.length === 0 ? (
        <Empty>Nothing written yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/posts/edit/?id=${p.id}`}
                className="adm-row flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 no-underline"
              >
                <span>
                  <span className="block text-body-l text-text-primary">{p.title}</span>
                  {p.author_name ? (
                    <span className="mt-0.5 block text-body-s text-text-tertiary">
                      by {p.author_name}
                    </span>
                  ) : null}
                </span>
                <StateBadge published={p.published} state={p.review_state} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
