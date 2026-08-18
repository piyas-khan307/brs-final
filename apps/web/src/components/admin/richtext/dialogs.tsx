"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE THREE THINGS YOU INSERT RATHER THAN FORMAT.
 *
 * Bold is a property of text you already typed. A link, a photograph and
 * a video are not — each needs something the document does not contain
 * yet, so each gets a proper dialog instead of window.prompt(). The old
 * editor used prompt() for links, which cannot be styled, cannot show
 * two fields, cannot validate before it closes, and on some browsers is
 * suppressed entirely.
 *
 * VIDEO WAS REMOVED ONCE AND IS BACK, on client direction both times.
 * Only the dialog ever went: the node, its editor view, the renderer and
 * the click-to-load facade on the published page were all kept precisely
 * so that asking for it again would be this file and a toolbar button
 * rather than a rebuild.
 * ══════════════════════════════════════════════════════════════════════
 */

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { items } from "@/lib/admin/client";
import { uploadAsset } from "@/lib/admin/ingest";
import {
  parseVideoUrl,
  RICH_IMAGE_DEFAULT_ALIGN,
  RICH_IMAGE_DEFAULT_WIDTH,
} from "@/lib/richtext/palette";
import { assetUrl, type AssetRow } from "../PhotoPicker";
import { Button, Empty, Field, Input, Modal, Notice } from "../ui";
import { primeAssets } from "./asset-cache";

/* ── Links ────────────────────────────────────────────────────────────
 *
 * Two fields, because that is what the brief asked for and because it is
 * what a link actually is: the words a reader sees, and where they go.
 * With one field you can only ever link text that already exists, which
 * means typing the words, selecting them, then opening the dialog.
 */
export function LinkDialog({
  editor,
  isOpen,
  onClose,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Opening on a selection fills the display text with it, and opening
  // on an existing link fills in the address it already has.
  useEffect(() => {
    if (!isOpen) return;
    const { from, to } = editor.state.selection;
    setText(editor.state.doc.textBetween(from, to, " "));
    setHref((editor.getAttributes("link").href as string) ?? "");
    setError(null);
  }, [isOpen, editor]);

  const submit = () => {
    const url = href.trim();
    if (!url) return setError("Paste the address you want to link to.");
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) {
      return setError(
        "An address must start with https:// , http:// or mailto: — or with / for a page on this site. Anything else is dropped when the page is built.",
      );
    }
    const label = text.trim() || url;
    const { from, to } = editor.state.selection;

    editor
      .chain()
      .focus()
      // insertContentAt with a collapsed range inserts; with a real one
      // it replaces. One call covers "link these words" and "add a link
      // here", which is why the display text is editable at all.
      .insertContentAt(
        { from, to },
        [{ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] }],
      )
      // Otherwise everything typed after the link is also a link.
      .unsetMark("link")
      .run();
    onClose();
  };

  return (
    <Modal title="Add a link" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field label="Text to display">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="the words a reader clicks"
          />
        </Field>
        <Field label="Paste link" required>
          <Input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </Field>
        <div className="flex gap-3">
          <Button variant="primary" onClick={submit}>
            Add link
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Video ────────────────────────────────────────────────────────────
 *
 * PASTE THE LINK FROM THE ADDRESS BAR. That is the whole interaction,
 * and it is deliberately not "paste your embed code".
 *
 * An embed code is a block of third-party HTML, sometimes carrying a
 * third-party <script>. Accepting one would put markup nobody on the
 * committee wrote into an article, and the entire storage format exists
 * to make that impossible — see lib/richtext/render.ts. So the editor
 * takes a URL, parseVideoUrl extracts a PROVIDER and an ID from it, and
 * those two short strings are all that is ever stored. The renderer
 * builds the iframe itself, from a hardcoded origin, at build time.
 *
 * The consequence a writer sees: any YouTube or Vimeo link works —
 * youtu.be/…, /watch?v=…, /shorts/…, /live/…, with or without the
 * tracking parameters that come with a Share button — and a link to
 * anything else is refused HERE, in a dialog, rather than silently
 * dropped by the content build a week later.
 */
export function VideoDialog({
  editor,
  isOpen,
  onClose,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* True while the real title is being looked up, so the caption field
     can say so rather than looking like it ignored the paste. */
  const [naming, setNaming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setUrl("");
    setTitle("");
    setError(null);
    setNaming(false);
  }, [isOpen]);

  /* Parsed on every keystroke, so the dialog can show WHICH video it
     found before anything is inserted. A YouTube id is eleven opaque
     characters; "we got a video" is not enough confirmation when the
     failure mode is publishing the wrong one. */
  const found = parseVideoUrl(url);
  const foundKey = found ? `${found.provider}:${found.id}` : "";

  /**
   * THE VIDEO'S REAL TITLE, FETCHED ONCE, HERE, AND THEN STORED AS OUR
   * OWN TEXT.
   *
   * A caption nobody types is a caption that says "YouTube video" on
   * the published page, and asking a writer to retype a title that
   * exists three feet away on another tab is how the field ends up
   * empty. So pasting a link fills it in.
   *
   * oEmbed, and only in the admin panel. It is one small JSON document
   * from a documented endpoint, it needs no key, and what comes back is
   * used as TEXT — the title string, nothing else. The `html` field
   * oEmbed also returns is exactly the third-party markup this whole
   * pipeline refuses to store, and it is ignored here.
   *
   * The published page never makes this call: the title is resolved
   * now, by a person who can see the result and edit it, and saved into
   * the document.
   *
   * Failure is silent by design. No key, no network, an unlisted video —
   * the field simply stays empty and the writer types their own, which
   * is what they would have done anyway.
   */
  useEffect(() => {
    if (!foundKey) return;
    const [provider, id] = foundKey.split(":");
    const endpoint =
      provider === "youtube"
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${id}`,
          )}`
        : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`;

    let live = true;
    setNaming(true);
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { title?: unknown } | null) => {
        if (!live) return;
        const found = typeof data?.title === "string" ? data.title.trim() : "";
        // Never overwrite something the writer has typed themselves.
        if (found) setTitle((t) => t || found);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setNaming(false);
      });

    return () => {
      live = false;
    };
  }, [foundKey]);

  const submit = () => {
    if (!url.trim()) return setError("Paste the link to the video.");
    if (!found) {
      return setError(
        "That is not a YouTube or Vimeo link. Copy the address from the browser's address bar, or from the Share button under the video.",
      );
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "brsEmbed",
        attrs: {
          provider: found.provider,
          videoId: found.id,
          title: title.trim() || null,
        },
      })
      .run();
    onClose();
  };

  return (
    <Modal title="Add a video" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}

        <Field label="Paste the video link" required>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </Field>

        {found ? (
          <div className="flex items-center gap-4 border border-line-hairline bg-bg-base p-3">
            {found.provider === "youtube" ? (
              // Admin-only, and the one external request in this dialog.
              // The published page never loads it — see EmbedView.
              <img
                src={`https://i.ytimg.com/vi/${found.id}/mqdefault.jpg`}
                alt=""
                width={160}
                height={90}
                className="h-auto w-40 shrink-0 border border-line-hairline object-cover"
              />
            ) : (
              <div className="flex h-24 w-40 shrink-0 items-center justify-center border border-line-hairline bg-bg-raised font-mono text-micro uppercase text-text-tertiary">
                Vimeo
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-micro uppercase text-text-tertiary">
                {found.provider} · {found.id}
              </p>
              <p className="mt-1 text-body-s text-text-secondary">
                Readers see this thumbnail and press play. Nothing loads from{" "}
                {found.provider === "youtube" ? "YouTube" : "Vimeo"} until they do.
              </p>
            </div>
          </div>
        ) : null}

        <Field
          label="Title"
          hint="Filled in from the video itself. Edit it to whatever should appear over the thumbnail on the page."
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={naming ? "Reading the video's title…" : "e.g. Robo Carnival 2024 — final round"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </Field>

        <div className="flex gap-3">
          <Button variant="primary" disabled={!found} onClick={submit}>
            Add video
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * THE UPLOAD FORM, WHICH IS A FILE INPUT AND NOTHING ELSE.
 *
 * The full PhotoPicker asks for a description and a photographer, and
 * for a cover photograph or a committee portrait that is right — those
 * are catalogued objects. Inside a write-up it is wrong: the writer is
 * mid-sentence, and two more boxes between them and the picture is two
 * more reasons to give up. Client direction, and the correct call.
 *
 * The description is not skipped, only moved: `assets.alt` carries a
 * placeholder that satisfies the CHECK (see lib/admin/ingest.ts), and
 * real alt text is typed on the selected picture in the article, where
 * the writer can actually see what they are describing.
 */
function Uploader({
  busy,
  onFiles,
}: {
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={`border border-dashed p-8 text-center transition-colors ${
        over ? "border-accent bg-bg-inset" : "border-line-strong bg-bg-base"
      }`}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {busy ? (
        <p className="text-body-m text-text-secondary">
          Uploading — a large photograph takes a few seconds. Do not close this.
        </p>
      ) : (
        <>
          <Button variant="primary" onClick={() => input.current?.click()}>
            Choose a picture
          </Button>
          <p className="mt-3 text-body-s text-text-tertiary">
            or drop one here. Straight off a phone is fine — it is resized and its location data
            removed automatically.
          </p>
        </>
      )}
    </div>
  );
}

/* ── Pictures ─────────────────────────────────────────────────────────
 *
 * THIS IS NOW THE ONLY WAY A PHOTOGRAPH GETS ONTO AN EVENT PAGE.
 *
 * There was a separate "photographs" panel below the write-up that
 * attached a contact sheet to the event. It is gone on client direction:
 * pictures belong in the writing, where the writer put them, not in a
 * tray underneath it. The cover photograph is still its own field,
 * because a cover is not part of the prose.
 *
 * The brief: "I should be able to add as much pic as possible." So the
 * library grid is MULTI-SELECT and inserts the lot in one go, and the
 * uploader takes several files at once — picking eight photographs
 * should be eight clicks and one button, not eight trips through a
 * modal.
 *
 * There are no nested modals here: this screen owns both the grid and
 * the uploader. A picker inside a picker was the alternative and it is
 * unusable.
 */
export function ImageDialog({
  editor,
  isOpen,
  onClose,
  attachedAssetIds,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  /** Photographs already attached to this event, newest strand of the
   *  archive first. Shown above the library — see `own` below. */
  attachedAssetIds?: string[];
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [own, setOwn] = useState<AssetRow[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /* A string, not the array: a fresh `[]` on every parent render would
     re-run the effect below forever. */
  const attachedKey = (attachedAssetIds ?? []).join(",");

  const refresh = useCallback(async () => {
    try {
      const found = await items.list<AssetRow>("assets", {
        fields: "id,alt,width,height,lqip,storage_key",
        sort: "-id",
        limit: 200,
      });
      setRows(found);
      // Node views read from this cache, so seeding it here means an
      // inserted picture paints immediately instead of re-fetching what
      // this grid already has in hand.
      primeAssets(found);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  /**
   * THIS EVENT'S OWN PHOTOGRAPHS, FETCHED BY ID RATHER THAN FILTERED OUT
   * OF THE LIBRARY.
   *
   * The library grid asks for 200 assets and there are 644. An archive
   * event from 2019 has 53 photographs, none of them recent, so nearly
   * none of them would appear in that window — the pictures the editor
   * is most likely to want would be the ones they could not find.
   */
  const loadOwn = useCallback(async () => {
    const ids = attachedKey ? attachedKey.split(",") : [];
    if (!ids.length) {
      setOwn([]);
      return;
    }
    try {
      const found = await items.list<AssetRow>("assets", {
        fields: "id,alt,width,height,lqip,storage_key",
        "filter[id][_in]": ids.join(","),
        limit: ids.length,
      });
      // Back into the event's own order, which is the order the club put
      // them in, not whatever the database returned.
      const byId = new Map(found.map((a) => [a.id, a]));
      setOwn(ids.map((i) => byId.get(i)).filter((a): a is AssetRow => Boolean(a)));
      primeAssets(found);
    } catch {
      // Not surfaced: the library below still works, and an error notice
      // about a convenience section would read as the dialog failing.
      setOwn([]);
    }
  }, [attachedKey]);

  useEffect(() => {
    if (!isOpen) return;
    setPicked([]);
    setError(null);
    setTab("library");
    void refresh();
    void loadOwn();
  }, [isOpen, refresh, loadOwn]);

  const insert = (assetIds: string[]) => {
    if (!assetIds.length) return;
    editor
      .chain()
      .focus()
      .insertContent(
        assetIds.map((assetId) => ({
          type: "brsImage",
          // Medium, left. See RICH_IMAGE_DEFAULT_ALIGN — a centred
          // picture clears, so it ignored the insertion point and
          // started a new row below whatever was already there.
          attrs: {
            assetId,
            align: RICH_IMAGE_DEFAULT_ALIGN,
            width: RICH_IMAGE_DEFAULT_WIDTH,
          },
        })),
      )
      .run();
    onClose();
  };

  const match = (a: AssetRow) => {
    const q = query.trim().toLowerCase();
    return q ? a.alt.toLowerCase().includes(q) : true;
  };
  const ownShown = own.filter(match);
  // The event's own photographs are not repeated in the library below.
  const ownIds = new Set(own.map((a) => a.id));
  const shown = (rows ?? []).filter((a) => !ownIds.has(a.id) && match(a));

  const toggle = (assetId: string) =>
    setPicked((p) => (p.includes(assetId) ? p.filter((x) => x !== assetId) : [...p, assetId]));

  const grid = (list: AssetRow[]) => (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {list.map((a) => {
        const order = picked.indexOf(a.id);
        return (
          <li key={a.id}>
            <button
              type="button"
              aria-pressed={order >= 0}
              aria-label={a.alt}
              onClick={() => toggle(a.id)}
              className={`relative block w-full border-2 transition-colors ${
                order >= 0 ? "border-accent" : "border-transparent hover:border-line-strong"
              }`}
            >
              <img
                src={assetUrl(a)}
                alt=""
                width={a.width}
                height={a.height}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              {order >= 0 ? (
                // The NUMBER, not a tick: they insert in the order they
                // were clicked, and an editor choosing eight should be
                // able to see that.
                <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-accent font-mono text-micro text-white">
                  {order + 1}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const heading = (text: string) => (
    <p className="mb-2 font-mono text-micro uppercase tabular text-text-tertiary">{text}</p>
  );

  return (
    <Modal title="Add a picture" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-1">
          {(
            [
              ["library", "From the library"],
              ["upload", "Upload a new one"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "secondary" : "quiet"}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        {tab === "upload" ? (
          <Uploader
            busy={uploading}
            onFiles={async (files) => {
              setError(null);
              setUploading(true);
              try {
                // Sequential, not Promise.all: the ingest service resizes
                // and re-encodes every file, and firing eight 8 MB phone
                // photos at it at once is how you get a timeout instead of
                // eight pictures.
                const ids: string[] = [];
                for (const f of files) ids.push(await uploadAsset(f));
                insert(ids);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        ) : (
          <>
            <Input
              placeholder="Search photographs by description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="max-h-80 space-y-5 overflow-y-auto pr-1">
              {rows === null ? (
                <p className="py-8 text-center text-body-s text-text-tertiary">
                  Loading photographs…
                </p>
              ) : ownShown.length === 0 && shown.length === 0 ? (
                <Empty>No matching photographs.</Empty>
              ) : (
                <>
                  {ownShown.length ? (
                    <div>
                      {heading(`Already on this event · ${ownShown.length}`)}
                      {grid(ownShown)}
                    </div>
                  ) : null}
                  {shown.length ? (
                    <div>
                      {ownShown.length ? heading("Everything else") : null}
                      {grid(shown)}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-line-hairline pt-4">
              <Button variant="primary" disabled={!picked.length} onClick={() => insert(picked)}>
                {picked.length > 1 ? `Insert ${picked.length} pictures` : "Insert picture"}
              </Button>
              <Button variant="quiet" onClick={onClose}>
                Cancel
              </Button>
              <span className="ml-auto text-body-s text-text-tertiary">
                Click each one you want.
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
