"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * CREATE AN EVENT.
 *
 * The club's brief was "like Blogger", and the half of that sentence
 * which decides whether any of this survives the annual handover is the
 * WRITING half. A committee member should get a title, a picture, a box
 * to type in, and a Publish button. Not fourteen labelled fields, which
 * is what this screen was.
 *
 * ── SO THE FIELDS ARE ORDERED BY WHAT AN EVENT IS ──
 * Title, cover, the description. That is the page a reader will see, in
 * the order they will see it, and it is the whole screen unless you go
 * looking.
 *
 * Category, date and venue live behind one disclosure, shut by default.
 * Series, edition, theme, presented-by and the rest are not on the
 * screen at all any more — but they are still loaded and written back
 * untouched, because an archive that cannot record which sponsor
 * presented the 4th Robo Carnival is a worse archive.
 *
 * ── PHOTOGRAPHS ARE PART OF THE WRITING NOW ──
 * There was a photographs card here. It is gone on client direction:
 * pictures go in through the picture button, where they can be sized,
 * aligned and placed in the paragraph they belong to.
 *
 * What that does NOT change is the archive as it stands. Sixty-eight of
 * the sixty-nine events arrived as a folder of pictures and a paragraph
 * of text — the photographs are attached to the event, but nothing ever
 * recorded where in the prose they go, so they publish as a gallery
 * underneath it. The line under the editor says so, and the picture
 * dialog offers them first. Nothing is inserted automatically: the 2019
 * Robo Carnival has fifty-three.
 *
 * ── THERE IS NO SUMMARY FIELD, AND THAT IS NOT AN OVERSIGHT ──
 * One stood here, wired to events.excerpt, with a character counter and
 * a 20–320 CHECK enforced in the database. It could not reach a reader.
 * EventDTO (packages/contract) has no excerpt member, so /v1/events has
 * never carried the column, and the feed card's text is generated in
 * scripts/fetch-content.mts as stripMarkdown(body).slice(0, 200).
 *
 * So the field was write-only: an editor spent a paragraph on it, the
 * length rule blocked Publish over it, and nothing ever displayed it.
 * Removed on client direction ("there is no need summary"). The column
 * and its CHECK stay — migrations here are additive, and existing rows
 * keep whatever they hold — this screen simply stops writing to it.
 *
 * Restoring it is NOT a matter of putting the Field back: it needs an
 * excerpt member on EventDTO, the adapter selecting it, and the
 * generator preferring it over the body slice. Note that migration 0012
 * wanted "a sentence that is not the first sentence of the body", which
 * is precisely what the slice gives you today.
 *
 * ── THE RULES ARE STATED BEFORE THEY ARE HIT ──
 * A published event must carry a publication date (a database CHECK),
 * and an event with no cover is not shown by the API at all. Both are
 * surfaced here, next to the control that would break them, because the
 * alternative is a red box after a save that discarded four paragraphs.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { RichText } from "@/components/admin/RichText";
import { useSession } from "@/components/admin/Session";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  useFlash,
} from "@/components/admin/ui";
import { RichPreview } from "@/components/admin/richtext/Preview";
import { items } from "@/lib/admin/client";
import { collectAssetIds, parseRichDoc } from "@/lib/richtext/render";

type Event = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  category_id: string | null;
  body: string;
  body_format: string;
  author_name: string | null;
  cover_asset_id: string | null;
  copy_source: string;
  series: string | null;
  edition: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  platform: string | null;
  theme: string | null;
  presented_by: string | null;
  eligibility: string | null;
  external_album: string | null;
  featured: boolean;
  published: boolean;
  published_at: string | null;
};


/** "Robo Carnival 2024" → "robo-carnival-2024". */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

function EventEditor() {
  const { user } = useSession();
  const router = useRouter();
  const id = useSearchParams().get("id");
  const isNew = !id;

  const [event, setEvent] = useState<Partial<Event>>({
    title: "",
    body: "",
    body_format: "md",
    // Written now, by a person, for the site — as opposed to "derived",
    // which marks the entries lifted from the club's old announcements
    // and makes the public page say so.
    copy_source: "authored",
    featured: false,
    published: false,
  });
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();
  const [slugTouched, setSlugTouched] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  /* Photographs already attached to this event. Not a section to manage —
     that was removed on client direction — but the picture dialog offers
     them first, and the line under the editor says they are there. */
  const [attached, setAttached] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    if (isNew) {
      setEvent((e) => ({
        ...e,
        author_name:
          [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
      }));
      setLoading(false);
      return;
    }
    items
      .get<Event>("events", id, { fields: "*" })
      .then((e) => {
        setEvent(e);
        setSlugTouched(true);
        setLoading(false);
      })
      .catch((err) => {
        setFlash({ tone: "error", text: (err as Error).message });
        setLoading(false);
      });

    items
      .list<{ asset_id: string }>("event_assets", {
        fields: "asset_id",
        "filter[event_id][_eq]": id,
        "filter[role][_eq]": "gallery",
        sort: "sort_order",
        limit: 500,
      })
      .then((r) => setAttached(r.map((x) => x.asset_id)))
      // Silent. This decides the order of a grid inside a dialog; a
      // notice about it would read as the event having failed to load.
      .catch(() => setAttached([]));
  }, [id, isNew, user, setFlash]);

  const set = <K extends keyof Event>(k: K, v: Event[K]) => setEvent((e) => ({ ...e, [k]: v }));

  /**
   * EVERY PHOTOGRAPH PLACED IN THE WRITING IS ALSO ATTACHED TO THE EVENT.
   *
   * The document stores an asset id, and the content build resolves it
   * against the images the API sent WITH this event — which is what gets
   * an inline picture its AVIF/WebP ladder, its LQIP and its dimensions
   * instead of one full-size original. An id the API never sent cannot
   * be resolved, so a picture that is only in the prose and not in
   * `event_assets` would silently vanish from the published page.
   *
   * So it is reconciled here, on save, rather than at the moment of
   * insertion. Three reasons: a brand-new event has no id to attach to
   * yet, one pass is one request rather than one per picture, and it
   * self-heals — a row deleted by hand comes back the next time somebody
   * saves the write-up that still refers to it.
   *
   * The article's own copy is then REMOVED from the contact sheet at
   * build time, so nothing appears twice. See fetch-content.mts.
   */
  const attachInlinePhotos = useCallback(async (eventId: string, body: string) => {
    const doc = parseRichDoc(body);
    if (!doc) return;
    const ids = collectAssetIds(doc);
    if (!ids.length) return;

    const rows = await items.list<{ asset_id: string; sort_order: number }>("event_assets", {
      fields: "asset_id,sort_order",
      "filter[event_id][_eq]": eventId,
      "filter[role][_eq]": "gallery",
      limit: 500,
    });
    const have = new Set(rows.map((r) => r.asset_id));
    let order = Math.max(0, ...rows.map((r) => r.sort_order ?? 0));

    for (const assetId of ids) {
      if (have.has(assetId)) continue;
      order += 1;
      await items.create("event_assets", {
        event_id: eventId,
        asset_id: assetId,
        role: "gallery",
        sort_order: order,
      });
    }
  }, []);

  const save = useCallback(
    async (patch: Partial<Event> = {}, message = "Saved.") => {
      setBusy(true);
      try {
        /* Caught here rather than by the database. `category_id` is NOT
           NULL, so without this the save comes back as a bare 500 —
           "The server had a problem" — for something the editor can fix
           in two clicks if told which two. */
        if (!event.category_id) {
          setFlash({
            tone: "error",
            text: "Choose a category first — it is under “Details for the archive”.",
          });
          return false;
        }
        const payload: Partial<Event> = {
          slug: event.slug || slugify(event.title ?? "") || `event-${Date.now()}`,
          title: event.title,
          // `category_id`, not `category`. The enum column is retired by
          // migration 0015 and is left holding whatever it already held;
          // writing it would mean this screen could only ever file an
          // event under one of the ten kinds that existed in 2026.
          category_id: event.category_id,
          // No `excerpt` key: omitted rather than set to null, so editing
          // an event that already has one does not erase it. See the
          // header — the column is retired from this screen, not dropped.
          body: event.body ?? "",
          // Whatever the editor last emitted. An archive entry opened and
          // saved arrives here as 'doc', because the editor converted it
          // on open; one that was never opened keeps its markdown.
          body_format: event.body_format ?? "md",
          author_name: event.author_name || null,
          cover_asset_id: event.cover_asset_id ?? null,
          copy_source: event.copy_source ?? "authored",
          series: event.series || null,
          edition: event.edition || null,
          start_date: event.start_date || null,
          end_date: event.end_date || null,
          venue: event.venue || null,
          platform: event.platform || null,
          theme: event.theme || null,
          presented_by: event.presented_by || null,
          eligibility: event.eligibility || null,
          external_album: event.external_album || null,
          featured: Boolean(event.featured),
          ...patch,
        };
        const saved = isNew
          ? await items.create<Event>("events", payload)
          : await items.update<Event>("events", id!, payload);

        // After the event exists, never before — a new one has no id to
        // attach photographs to until this point.
        if (saved.body_format === "doc") {
          await attachInlinePhotos(saved.id, saved.body ?? "");
        }

        setEvent(saved);
        setFlash({ tone: "success", text: message });
        if (isNew) router.replace(`/admin/events/edit/?id=${saved.id}`);
        return true;
      } catch (e) {
        setFlash({ tone: "error", text: (e as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [event, isNew, id, router, setFlash, attachInlinePhotos],
  );

  if (loading) return <Loading what="the event" />;
  if (!user) return null;

  // Everything standing between this event and a reader. Listed rather
  // than merely blocking, because "Publish is greyed out" is not a
  // reason.
  const blockers: string[] = [
    ...(event.title?.trim() ? [] : ["it needs a name"]),
    ...(event.category_id ? [] : ["it needs a category — open “Details for the archive” and pick one"]),
    ...(event.cover_asset_id
      ? []
      : ["it needs a cover photograph — the feed is a wall of pictures and a card without one has nothing to show"]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={event.published ? "Live on the site" : "Draft"}
        title={isNew ? "Create event" : "Edit event"}
        action={
          <div className="flex gap-2">
            {event.published && event.slug ? (
              <Link href={`/events/${event.slug}/`} target="_blank">
                <Button variant="quiet">View page</Button>
              </Link>
            ) : null}
            <Link href="/admin/events/">
              <Button variant="quiet">Back to events</Button>
            </Link>
          </div>
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {/* ── The article ──────────────────────────────────────────────── */}
      <div className="space-y-6">
        <Field label="Name of the event" required>
          <Input
            value={event.title ?? ""}
            placeholder="e.g. Robo Carnival"
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
        </Field>

        <Card>
          <PhotoPicker
            label="Cover photograph"
            value={event.cover_asset_id ?? null}
            onChange={(assetId) => set("cover_asset_id", assetId)}
          />
        </Card>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span
              className="text-body-m text-text-primary"
              style={{ fontVariationSettings: "'wght' 600" }}
            >
              Description
            </span>
            {/* Two views of one thing. A third, "Source", showed the
                stored document — useful while the format was new and
                clutter once it was not. Removed on client direction. */}
            <div className="flex gap-1">
              {(
                [
                  ["write", "Write"],
                  ["preview", "Preview"],
                ] as const
              ).map(([key, text]) => (
                <Button
                  key={key}
                  variant={view === key ? "secondary" : "quiet"}
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-2">
            {view === "preview" ? (
              // The SAME renderers the site uses at build time, so this
              // is the page rather than an approximation of it —
              // including the fact that anything looking like HTML comes
              // out as visible text. And the same box the writing sits
              // in, class for class, so switching tabs changes what is
              // on the page and nothing about the page itself.
              <div className="adm-editor">
                <div className="adm-richtext">
                  <RichPreview
                    content={event.body ?? ""}
                    format={event.body_format ?? "md"}
                  />
                </div>
              </div>
            ) : (
              <>
                <RichText
                  value={event.body ?? ""}
                  format={event.body_format ?? "md"}
                  attachedAssetIds={attached}
                  onChange={(next) => {
                    setEvent((e) => ({ ...e, body: next.content, body_format: next.format }));
                  }}
                />
                {/* THE ARCHIVE'S PHOTOGRAPHS ARE ATTACHED, NOT PLACED.
                    Sixty-eight of the sixty-nine events came in as a
                    folder of pictures and a paragraph of text: the
                    photographs belong to the event but nobody ever said
                    WHERE in the writing they go, so they publish as a
                    gallery underneath it. Without this line they are
                    invisible here and look lost. Not auto-inserted —
                    Robo Carnivals 2019 has fifty-three of them, and
                    dropping fifty-three pictures into a 2,500-character
                    write-up is not an improvement. */}
                {attached.length ? (
                  <p className="mt-3 text-body-s text-text-tertiary">
                    {attached.length} photograph{attached.length === 1 ? " is" : "s are"} attached
                    to this event and appear as a gallery below the description on the site. Use
                    the picture button to place any of them in the writing — they are offered
                    first, and one placed here leaves the gallery.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Everything else ──────────────────────────────────────────── */}
      <details className="border border-line-hairline bg-bg-raised">
        <summary className="cursor-pointer px-5 py-4 text-body-m text-text-primary">
          Details for the archive
          <span className="ml-3 font-mono text-micro uppercase text-text-tertiary">
            category, date, venue
          </span>
        </summary>

        {/* Three things, on client direction. End date, series, edition,
            platform, theme, presented-by, "open to", byline and web
            address all stood here and are gone from the SCREEN only.
            They are still LOADED (`fields: "*"`) and still written back
            unchanged on save, so an archive entry that already records
            which sponsor presented the 4th Robo Carnival still records
            it after somebody opens it here to fix a typo. The columns,
            the API and the public page are untouched; putting a Field
            back is all it takes to edit them again. */}
        <div className="space-y-5 border-t border-line-hairline px-5 py-6">
          <CategoryPicker
            value={event.category_id ?? null}
            onChange={(categoryId) => set("category_id", categoryId)}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date">
              <Input
                type="date"
                value={event.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value || null)}
              />
            </Field>
            <Field label="Venue">
              <Input
                value={event.venue ?? ""}
                onChange={(e) => set("venue", e.target.value || null)}
              />
            </Field>
          </div>
        </div>
      </details>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      {blockers.length && !event.published ? (
        <Notice tone="warning">
          Not ready to publish yet: {blockers.join("; ")}. You can still save it as a draft.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-line-hairline pt-6">
        <Button variant="secondary" busy={busy} onClick={() => save()}>
          Save draft
        </Button>

        {!event.published ? (
          <Button
            variant="primary"
            busy={busy}
            disabled={blockers.length > 0}
            onClick={() =>
              save(
                {
                  published: true,
                  // WHEN IT WENT PUBLIC, not when it happened. A 2016
                  // workshop written up today is filed under 2016 in the
                  // archive and appears at the top of the feed today. The
                  // events_published_needs_a_date CHECK requires this.
                  published_at: event.published_at ?? new Date().toISOString(),
                },
                "Published. It appears on the site at the next rebuild.",
              )
            }
          >
            Publish
          </Button>
        ) : (
          <Button
            variant="secondary"
            busy={busy}
            // published_at is deliberately left alone. It records when this
            // first went public, and putting it back up later should not
            // claim it was written today.
            onClick={() => save({ published: false }, "Taken off the site.")}
          >
            Take off the site
          </Button>
        )}

        {!isNew ? (
          <span className="ml-auto">
            <ConfirmButton
              what={event.title || "this event"}
              onConfirm={async () => {
                await items.remove("events", id!);
                router.replace("/admin/events/");
              }}
            >
              Delete
            </ConfirmButton>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary under static export.
  return (
    <Suspense fallback={<Loading what="the event" />}>
      <EventEditor />
    </Suspense>
  );
}
