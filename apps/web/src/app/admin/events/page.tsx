"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * EVERY EVENT THE CLUB HAS RUN, AS A LIST OF ARTICLES.
 *
 * This screen used to be a RecordEditor: a row of titles, and a form of
 * fourteen labelled fields behind each one. That is the right shape for
 * partners and press, where an entry IS its fields. An event is not — it
 * is a piece of writing with a photograph on it, and the club asked for
 * Blogger, which is a statement about exactly this.
 *
 * So: a picture, a title, a sentence, and what state it is in. The same
 * three things the public feed shows, because an editor should be able to
 * recognise the row they are looking for by the thing they will see on
 * the site.
 *
 * ── SIXTY-FIVE ROWS NEEDS A SEARCH BOX ──
 * Nineteen of the events are called some version of "Basic Workshop".
 * Scrolling for the right one is how the wrong one gets edited, so the
 * filter is here from the start rather than after somebody does it.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StateBadge } from "@/app/admin/page";
import { assetUrl, type AssetRow } from "@/components/admin/PhotoPicker";
import { Button, Empty, Input, Loading, Notice, PageHeader } from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

type Row = {
  id: string;
  title: string;
  slug: string;
  /* Directus resolves the relation, so the list shows the category's
     real name rather than a title-cased slug. */
  category_id: { name: string } | null;
  start_date: string | null;
  edition: string | null;
  published: boolean;
  cover_asset_id: string | null;
};

/** The year an event is filed under, or nothing. Never a guess — a good
 *  third of the archive is a folder with no date in it at all. */
const when = (r: Row) => r.start_date?.slice(0, 4) ?? r.edition ?? "";

export default function EventsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [covers, setCovers] = useState<Map<string, AssetRow>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "live" | "draft">("all");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const events = await items.list<Row>("events", {
          fields: "id,title,slug,category_id.name,start_date,edition,published,cover_asset_id",
          sort: "-start_date",
          limit: 300,
        });
        if (cancelled) return;
        setRows(events);

        // One request for every cover, rather than expanding the relation
        // per row — Directus would happily do the latter and it is sixty-
        // five joins for a page of thumbnails.
        const ids = [...new Set(events.map((e) => e.cover_asset_id).filter(Boolean))] as string[];
        if (!ids.length) return;
        const assets = await items.list<AssetRow>("assets", {
          fields: "id,alt,width,height,lqip,storage_key",
          "filter[id][_in]": ids.join(","),
          limit: ids.length,
        });
        if (cancelled) return;
        setCovers(new Map(assets.map((a) => [a.id, a])));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (only === "all" || (only === "live") === r.published) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          r.slug.includes(needle) ||
          (r.category_id?.name ?? "").toLowerCase().includes(needle) ||
          when(r).includes(needle)),
    );
  }, [rows, q, only]);

  const drafts = (rows ?? []).filter((r) => !r.published).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Workshops, competitions, carnivals and seminars — each one written up like a blog post. A draft is saved but not on the site."
        action={
          <Link href="/admin/events/edit/">
            <Button variant="primary">Create event</Button>
          </Link>
        }
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {rows === null ? (
        <Loading what="events" />
      ) : rows.length === 0 ? (
        <Empty>Nothing on record yet. Use “Create event” to add the first.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-64 flex-1">
              <Input
                type="search"
                value={q}
                placeholder="Search by name, kind or year…"
                aria-label="Search events"
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["all", `All ${rows.length}`],
                  ["live", `Live ${rows.length - drafts}`],
                  ["draft", `Drafts ${drafts}`],
                ] as const
              ).map(([key, text]) => (
                <Button
                  key={key}
                  variant={only === key ? "secondary" : "quiet"}
                  aria-pressed={only === key}
                  onClick={() => setOnly(key)}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <Empty>Nothing matches that.</Empty>
          ) : (
            <ul className="space-y-2">
              {shown.map((r) => {
                const cover = r.cover_asset_id ? covers.get(r.cover_asset_id) : undefined;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/events/edit/?id=${r.id}`}
                      className="adm-row flex items-center gap-4 px-4 py-3 no-underline"
                    >
                      {cover ? (
                        <img
                          src={assetUrl(cover)}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          className="h-16 w-16 shrink-0 border border-line-hairline object-cover"
                        />
                      ) : (
                        // Named, not blank. "No cover" is the reason this
                        // event is missing from the site, and the list is
                        // where somebody should notice.
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-dashed border-line-hairline text-center font-mono text-micro uppercase text-text-tertiary">
                          No cover
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block text-body-l text-text-primary">{r.title}</span>
                        <span className="mt-0.5 block font-mono text-micro uppercase text-text-tertiary">
                          {r.category_id?.name ?? "Uncategorised"}
                          {when(r) ? ` · ${when(r)}` : ""}
                        </span>
                      </span>

                      <StateBadge published={r.published} state="draft" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
