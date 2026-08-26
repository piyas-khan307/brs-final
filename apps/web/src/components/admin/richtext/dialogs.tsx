"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE THINGS YOU INSERT RATHER THAN FORMAT.
 *
 * Bold is a property of text you already typed. A link, a photograph, a
 * video and a button are not — each needs something the document does
 * not contain yet, so each gets a proper dialog instead of
 * window.prompt(). The old editor used prompt() for links, which cannot
 * be styled, cannot show two fields, cannot validate before it closes,
 * and on some browsers is suppressed entirely.
 *
 * A ROW OF COLUMNS HAS NO DIALOG, and that is not an oversight. Its only
 * question is "how many?", which is one chip-press to change once the
 * row is on the page — so asking first would be a modal whose answer is
 * always revised afterwards anyway.
 *
 * VIDEO WAS REMOVED ONCE AND IS BACK, on client direction both times.
 * Only the dialog ever went: the node, its editor view, the renderer and
 * the click-to-load facade on the published page were all kept precisely
 * so that asking for it again would be this file and a toolbar button
 * rather than a rebuild.
 * ══════════════════════════════════════════════════════════════════════
 */

import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { items } from "@/lib/admin/client";
import { uploadAsset } from "@/lib/admin/ingest";
import {
  buttonAttrs,
  buttonColour,
  buttonVars,
  buttonWeight,
  buttonHasFill,
  buttonRadius,
  buttonSize,
  buttonVariant,
  isPdfDataUrl,
  parseVideoUrl,
  RICH_BUTTON_SIZES,
  RICH_BUTTON_SIZE_DEFAULT,
  RICH_BUTTON_VARIANTS,
  RICH_BUTTON_RADII,
  RICH_BUTTON_RADIUS_DEFAULT,
  RICH_BUTTON_VARIANT_DEFAULT,
  RICH_BUTTON_WEIGHTS,
  RICH_BUTTON_WEIGHT_DEFAULT,
  RICH_IMAGE_DEFAULT_ALIGN,
  RICH_IMAGE_DEFAULT_WIDTH,
  RICH_PDF_MAX_BYTES,
} from "@/lib/richtext/palette";
import { assetUrl, type AssetRow } from "../PhotoPicker";
import { Button, Empty, Field, Input, Modal, Notice, Select } from "../ui";
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
 * ADD A PDF — A FILE INPUT AND A SIZE LIMIT.
 *
 * Unlike a picture, there is no library and no ingest service behind
 * this: the file becomes a data URL and the data URL becomes the node.
 * So the two things this screen does are the two things that decision
 * makes necessary — refuse a file that is not a PDF, and refuse one too
 * large to live inside a document (RICH_PDF_MAX_BYTES). Everything else
 * a writer might set — width, height, alignment — is set on the block
 * once it is on the page, by dragging it, the same as a picture.
 *
 * The read is FileReader.readAsDataURL, which yields exactly the
 * `data:<mime>;base64,…` shape the renderer's validator demands — and
 * the validator runs here too, so a file the browser typed as something
 * other than application/pdf is caught in front of the person who chose
 * it rather than silently dropped at publish.
 */
export function PdfDialog({
  editor,
  isOpen,
  onClose,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  const choose = (file: File | null) => {
    if (!file) return;
    setError(null);

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setError("That is not a PDF. Choose a file ending in .pdf.");
      return;
    }
    if (file.size > RICH_PDF_MAX_BYTES) {
      const mb = (RICH_PDF_MAX_BYTES / (1024 * 1024)).toFixed(0);
      setError(
        `That PDF is ${(file.size / (1024 * 1024)).toFixed(1)} MB. A PDF shown inside a page ` +
          `has to fit inside the page, so the limit is ${mb} MB — a larger one belongs behind a link.`,
      );
      return;
    }

    setBusy(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setBusy(false);
      setError("The file could not be read. Try again.");
    };
    reader.onload = () => {
      setBusy(false);
      const url = typeof reader.result === "string" ? reader.result : "";
      // The MIME the browser stamped can be `application/octet-stream`
      // for a PDF on some systems; rewrite the prefix to the one the
      // validator and the renderer both require, since the bytes are a
      // PDF either way. Only the prefix, and only when the tail is
      // already base64 — never inventing content.
      const normalised = url.replace(/^data:[^;,]*;base64,/, "data:application/pdf;base64,");
      if (!isPdfDataUrl(normalised)) {
        setError("That file did not read as a valid PDF. Try re-saving it and uploading again.");
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({
          type: "brsPdf",
          attrs: { src: normalised, name: file.name },
        })
        .run();
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal title="Add a PDF" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}

        <Field
          label="The PDF file"
          hint={`Shown whole, in the reader's own PDF viewer. Up to ${(RICH_PDF_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB.`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
            className="block w-full text-body-s text-text-secondary file:mr-4 file:border file:border-line-strong file:bg-bg-raised file:px-4 file:py-2 file:text-body-s file:text-text-primary hover:file:border-accent"
          />
        </Field>

        {busy ? <p className="text-body-s text-text-secondary">Reading the file…</p> : null}

        <div className="flex gap-3">
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
  pickOne,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  /** Photographs already attached to this event, newest strand of the
   *  archive first. Shown above the library — see `own` below. */
  attachedAssetIds?: string[];
  /**
   * WHEN THIS IS SET, THE DIALOG HANDS BACK AN ID INSTEAD OF INSERTING.
   *
   * A band's background needs the same grid, the same search, the same
   * uploader and the same "this event's own photographs first" — it
   * differs only in what happens at the end. A second dialog would have
   * been four hundred lines of picker whose bugs are fixed twice; this
   * is the one branch that actually differs.
   *
   * Only the first of a multiple selection is taken. A band has one
   * background, and the grid's numbered badges make it obvious which
   * one that is.
   */
  pickOne?: (assetId: string) => void;
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
    if (pickOne) {
      const [first] = assetIds;
      if (first) pickOne(first);
      onClose();
      return;
    }
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
    <Modal
      title={pickOne ? "Choose a background" : "Add a picture"}
      isOpen={isOpen}
      onClose={onClose}
    >
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
                {pickOne
                  ? "Use as background"
                  : picked.length > 1
                    ? `Insert ${picked.length} pictures`
                    : "Insert picture"}
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

/* ── A button ─────────────────────────────────────────────────────────
 *
 * ONE DIALOG THAT BOTH MAKES AND EDITS.
 *
 * The alternative was an insert dialog plus a separate edit dialog, and
 * they would have been the same five fields twice — the second copy
 * being the one that quietly stops matching the first when a sixth
 * field is added. Which of the two it is doing is read from the
 * selection: a selected brsButton is edited in place, anything else
 * gets a new one.
 *
 * ── WHY THE ADDRESS IS CHECKED HERE ──
 * render.ts drops a button whose href it cannot keep, so an unchecked
 * address would be a control that looks right in the editor, saves
 * without complaint, and is simply missing from the page a week later.
 * The same reasoning as the video dialog: refuse it in front of the
 * person who typed it.
 */
/** An on/off switch drawn as a button rather than a checkbox: these
 *  three are text formatting, and a writer already knows what a pressed
 *  I means. `aria-pressed` is what makes that legible to anything that
 *  is not looking at it. */
function Toggle({
  on,
  label,
  onPress,
  children,
}: {
  on: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onPress}
      className={`h-9 w-9 border text-body-m transition-colors ${
        on
          ? "border-accent bg-bg-inset text-text-primary"
          : "border-line-hairline text-text-secondary hover:border-accent hover:text-text-primary"
      }`}
      style={{ fontVariationSettings: "'wght' 600" }}
    >
      {children}
    </button>
  );
}

/**
 * A COLOUR, AND A WAY BACK TO NOT HAVING ONE.
 *
 * The reset is not decoration. A native colour input has no empty
 * state — it always shows something, and once it has been opened there
 * is no gesture inside it that means "actually, use the style's
 * colour". Without a way back, the first accidental click on the swatch
 * would permanently detach a button from the theme, and the writer
 * would have no idea why it stopped following the palette.
 */
function ColourField({
  label,
  value,
  fallback,
  disabled,
  onChange,
}: {
  label: string;
  /** null means "whatever the style says" — the usual answer. */
  value: string | null;
  /** What the style would show, so the swatch is not lying while unset. */
  fallback: string;
  disabled?: boolean;
  onChange: (next: string | null) => void;
}) {
  /* NO HINT. The line beside the swatch already reads "from the style"
     or "not used by this style", and a paragraph under the label
     repeating it in other words was the same sentence twice — printed
     identically under both pickers, where it also knocked the two
     swatches out of line with each other. */
  return (
    <Field label={label}>
      <span className="flex items-center gap-3">
        <input
          type="color"
          aria-label={label}
          disabled={disabled}
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-14 cursor-pointer border border-line-hairline bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="font-mono text-body-s text-text-secondary">
          {disabled ? "not used by this style" : (value ?? "from the style")}
        </span>
        {value && !disabled ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
          >
            Reset
          </button>
        ) : null}
      </span>
    </Field>
  );
}

export function ButtonDialog({
  editor,
  isOpen,
  onClose,
}: {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [variant, setVariant] = useState<string>(RICH_BUTTON_VARIANT_DEFAULT);
  const [size, setSize] = useState<string>(RICH_BUTTON_SIZE_DEFAULT);
  const [radius, setRadius] = useState<string>(RICH_BUTTON_RADIUS_DEFAULT);
  const [bg, setBg] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>(RICH_BUTTON_WEIGHT_DEFAULT);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [caps, setCaps] = useState(false);
  const [fg, setFg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** The selected node, when the selection IS a button. Read at open and
   *  again at submit, because the modal does not move it. */
  const selectedButton = useCallback(() => {
    const sel = editor.state.selection;
    return sel instanceof NodeSelection && sel.node.type.name === "brsButton" ? sel.node : null;
  }, [editor]);

  useEffect(() => {
    if (!isOpen) return;
    const node = selectedButton();
    if (node) {
      setLabel(typeof node.attrs.label === "string" ? node.attrs.label : "");
      setHref(typeof node.attrs.href === "string" ? node.attrs.href : "");
      setVariant(buttonVariant(node.attrs.variant));
      setSize(buttonSize(node.attrs.size));
      setRadius(buttonRadius(node.attrs.radius));
      setBg(buttonColour(node.attrs.bg));
      setFg(buttonColour(node.attrs.fg));
      setWeight(buttonWeight(node.attrs.weight));
      setItalic(Boolean(node.attrs.italic));
      setUnderline(Boolean(node.attrs.underline));
      setCaps(Boolean(node.attrs.caps));
      setEditing(true);
    } else {
      // Opening on a selection uses those words as the label, the same
      // courtesy the link dialog does.
      const { from, to } = editor.state.selection;
      setLabel(editor.state.doc.textBetween(from, to, " "));
      setHref("");
      setVariant(RICH_BUTTON_VARIANT_DEFAULT);
      setSize(RICH_BUTTON_SIZE_DEFAULT);
      setRadius(RICH_BUTTON_RADIUS_DEFAULT);
      setBg(null);
      setFg(null);
      setWeight(RICH_BUTTON_WEIGHT_DEFAULT);
      setItalic(false);
      setUnderline(false);
      setCaps(false);
      setEditing(false);
    }
    setError(null);
  }, [isOpen, editor, selectedButton]);

  const submit = () => {
    const words = label.trim();
    const url = href.trim();
    if (!words) return setError("Give the button its words — “Register now”, “Read the rules”.");
    if (!url) return setError("A button needs somewhere to go.");
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) {
      return setError(
        "An address must start with https:// , http:// or mailto: — or with / for a page on this site. Anything else is dropped when the page is built.",
      );
    }

    const attrs = { label: words, href: url, variant, size, radius, bg, fg, weight, italic, underline, caps };
    if (selectedButton()) {
      editor.chain().focus().updateAttributes("brsButton", attrs).run();
    } else {
      const { from } = editor.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(from, { type: "brsButton", attrs })
        .run();
    }
    onClose();
  };

  /* Built by the same function the editor and the renderer use, so this
     is the button rather than a drawing of one. Seven settings is more
     than anybody can hold in their head as a description; one of them
     has to be shown. */
  const look = buttonAttrs({ variant, size, radius, bg, fg, weight, italic, underline, caps });
  const hasFill = buttonHasFill(variant);

  return (
    <Modal title={editing ? "Edit the button" : "Add a button"} isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}

        <Field label="Words on the button" required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Register now"
          />
        </Field>

        <Field label="Where it goes" required>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Style">
            <Select value={variant} onChange={(e) => setVariant(e.target.value)}>
              {RICH_BUTTON_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Size">
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              {RICH_BUTTON_SIZES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Corners">
            <Select value={radius} onChange={(e) => setRadius(e.target.value)}>
              {RICH_BUTTON_RADII.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColourField
            label="Button colour"
            value={bg}
            fallback="#7a1f2b"
            disabled={!hasFill}
            onChange={setBg}
          />
          <ColourField
            label="Word colour"
            value={fg}
            fallback={hasFill ? "#ffffff" : "#7a1f2b"}
            onChange={setFg}
          />
        </div>

        <Field label="The words">
          <span className="flex flex-wrap items-center gap-3">
            <Select
              aria-label="Weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-auto"
            >
              {RICH_BUTTON_WEIGHTS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </Select>
            {/* Bold is absent on purpose: bold IS a weight, and a
                switch beside the menu would be a second control for the
                same property. */}
            <Toggle on={italic} label="Italic" onPress={() => setItalic(!italic)}>
              <span style={{ fontStyle: "italic" }}>I</span>
            </Toggle>
            <Toggle on={underline} label="Underline" onPress={() => setUnderline(!underline)}>
              <span style={{ textDecoration: "underline" }}>U</span>
            </Toggle>
            <Toggle on={caps} label="Capitals" onPress={() => setCaps(!caps)}>
              AA
            </Toggle>
          </span>
        </Field>

        <Field label="How it will look">
          <span className="flex min-h-16 items-center justify-center border border-line-hairline bg-bg-inset p-4">
            <span className={look.class} style={buttonVars({ variant, bg, fg, weight }) as React.CSSProperties}>
              {label.trim() || "Button"}
            </span>
          </span>
        </Field>

        <div className="flex gap-3">
          <Button variant="primary" onClick={submit}>
            {editing ? "Save the button" : "Add button"}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
