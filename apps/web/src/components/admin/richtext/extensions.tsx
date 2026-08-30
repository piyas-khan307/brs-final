"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE THREE THINGS TIPTAP DOES NOT SHIP.
 *
 * StarterKit already gives us bold, italic, underline, strike, code,
 * links, both lists, headings, quote, rule and undo — so those are
 * configured, not written. What is here is the three pieces that have to
 * know about THIS site:
 *
 *   BrsStyle   font / size / colour / highlight, stored as TOKEN NAMES
 *              rather than CSS, for the reasons in lib/richtext/palette.ts
 *   BrsImage   an inline photograph, stored as an ASSET ID so it keeps
 *              the derivatives, the EXIF strip and the content-addressing
 *   BrsEmbed   a video, stored as PROVIDER + ID so no third-party markup
 *              is ever held or trusted
 *
 * The common thread: none of them stores a URL or a style, because a URL
 * bypasses the asset pipeline and a style bypasses the design system.
 * Each stores the smallest identifier that lets the renderer build the
 * real thing at publish time.
 * ══════════════════════════════════════════════════════════════════════
 */

import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  Extension,
  Mark,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import {
  embedSrc,
  imageAspect,
  imageWidth,
  isProvider,
  RICH_ALIGNS,
  RICH_EMBED_DEFAULT_WIDTH,
  RICH_IMAGE_ALIGNS,
  RICH_IMAGE_SIZES,
  RICH_IMAGE_WIDTH_MAX,
  RICH_IMAGE_WIDTH_MIN,
  richLead,
  richStyleAttrs,
  type RichImageAlign,
} from "@/lib/richtext/palette";
import { documentUrl } from "../documents";
import { assetUrl, type AssetRow } from "../PhotoPicker";
import { loadAsset, onAssetsChanged, peekAsset } from "./asset-cache";
import { loadDocument, onDocumentsChanged, peekDocument } from "./document-cache";

/* ══ BrsStyle ═════════════════════════════════════════════════════════
 *
 * ONE mark carrying four attributes, not four marks.
 *
 * Four separate marks would nest four spans around a word that is
 * serif, 24px, oxblood and highlighted — and, worse, the document tree
 * would differ depending on which order the buttons were pressed, so two
 * visually identical paragraphs would store differently. One mark with
 * four attributes has exactly one representation, and Tiptap's setMark
 * merges attributes into a mark of the same type already on the range,
 * so setting the size of already-serif text keeps the serif.
 *
 * Both a class AND data attributes are emitted. The class is what styles
 * it; the data attributes are what parseHTML reads back, which is how
 * copy-and-paste inside the editor survives. Only the class reaches a
 * reader — the published page is rendered from JSON by render.ts, which
 * emits no data attributes at all.
 */
export const BrsStyle = Mark.create({
  name: "brsStyle",

  addAttributes() {
    const attr = (name: string, parse: (v: string | null) => unknown = (v) => v) => ({
      default: null as unknown,
      parseHTML: (el: HTMLElement) => parse(el.getAttribute(`data-rt-${name}`)),
      // Contribute nothing individually — renderHTML below builds one
      // class attribute out of all four together.
      renderHTML: () => ({}),
    });
    return {
      font: attr("font"),
      size: attr("size", (v) => (v == null ? null : Number(v))),
      ink: attr("ink"),
      mark: attr("mark"),
      spacing: attr("spacing"),
    };
  },

  parseHTML() {
    return [{ tag: "span[data-rt-style]" }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const a = mark.attrs as Record<string, unknown>;
    // The SAME builder the published renderer uses, so a colour looks
    // identical in the box and on the page rather than being two
    // implementations that drift.
    const painted = richStyleAttrs(a);
    const data: Record<string, string> = { "data-rt-style": "" };
    for (const k of ["font", "size", "ink", "mark", "spacing"] as const) {
      if (a[k] != null) data[`data-rt-${k}`] = String(a[k]);
    }
    // An empty class would leave a span doing nothing; keep it anyway so
    // the mark survives a round trip and can be unset.
    return ["span", mergeAttributes(HTMLAttributes, data, painted), 0];
  },
});

/* ══ KeepPendingMarks ═════════════════════════════════════════════════
 *
 * A CLICK THAT DOES NOT MOVE THE CURSOR MUST NOT THROW AWAY A COLOUR.
 *
 * Choosing a colour with nothing selected sets a "stored mark": the
 * next thing typed comes out in that colour. Choosing it also focuses
 * the editor, so the box lights up and the cursor is already where the
 * writer left it.
 *
 * The trap is what anyone does next. The box has just lit up, so they
 * click into it before typing — and ProseMirror clears stored marks on
 * any transaction that sets a selection, INCLUDING one that lands on the
 * exact position the cursor was already at. So the colour vanished for
 * clicking on the spot the cursor was already blinking, while typing
 * straight away worked. Same intent, two outcomes, no way to tell why.
 *
 * This restores the pending marks when, and only when, the cursor did
 * not actually go anywhere. Clicking somewhere ELSE still clears them,
 * which is correct — moving to different text should adopt that text's
 * formatting, not carry a colour along.
 *
 * It covers bold and italic too, which had the identical fault.
 */
export const KeepPendingMarks = Extension.create({
  name: "keepPendingMarks",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("keepPendingMarks"),
        appendTransaction(transactions, oldState, newState) {
          const pending = oldState.storedMarks;
          if (!pending?.length) return null;
          // Already survived, or something was actually typed.
          if (newState.storedMarks?.length) return null;
          if (transactions.some((t) => t.docChanged)) return null;
          // Only a collapsed cursor that stayed exactly put.
          if (!oldState.selection.empty || !newState.selection.empty) return null;
          if (oldState.selection.from !== newState.selection.from) return null;
          return newState.tr.setStoredMarks(pending);
        },
      }),
    ];
  },
});

/* ══ BrsImage ═════════════════════════════════════════════════════════ */

const isAlignValue = (v: unknown): v is RichImageAlign =>
  typeof v === "string" && (RICH_IMAGE_ALIGNS as readonly string[]).includes(v);

/**
 * The eight grips of a bounding box, named by compass point.
 *
 * Four corners and four edge midpoints, because that is the shape every
 * program that resizes anything has used for thirty years and nobody has
 * to be told what they are. The two on the left and right edges do the
 * same thing as the corners — they exist because that is where the hand
 * goes when the intention is "narrower".
 */
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

/**
 * THE NEAREST ANCESTOR THAT ACTUALLY HAS A WIDTH.
 *
 * Resizing is expressed as a percentage of the column, so it needs the
 * column's width in pixels. `parentElement` is not good enough: Tiptap
 * wraps every React node view in its own element, and that wrapper is
 * `display: contents` (see globals.css) so that it stops interfering
 * with the layout. An element with no box reports clientWidth 0, every
 * drag divided by 1 instead of by ~900, and the width pinned to 100% on
 * the first pixel of movement — which read as the handles not working
 * at all.
 */
function measurableParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p && p.clientWidth === 0) p = p.parentElement;
  return p;
}

/**
 * The picture as it appears WHILE WRITING.
 *
 * It resolves its own asset because the document only holds an id. The
 * controls appear on selection rather than permanently: a column of
 * photographs each wearing a four-button toolbar is a control panel, not
 * a draft.
 */
function ImageView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const assetId = node.attrs.assetId as string | null;
  const align = isAlignValue(node.attrs.align) ? node.attrs.align : "center";
  const alt = (node.attrs.alt as string | null) ?? "";
  const width = imageWidth(node.attrs.width);

  const crop = imageAspect(node.attrs.crop);

  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"width" | "crop" | null>(null);
  const [row, setRow] = useState<AssetRow | null>(() =>
    assetId ? peekAsset(assetId) : null,
  );
  const [gone, setGone] = useState(false);

  /**
   * DRAG A CORNER TO RESIZE.
   *
   * Pointer events rather than mouse events, so a pen and a touchscreen
   * work identically, and `setPointerCapture` so the drag survives the
   * cursor leaving the handle — without it, moving faster than React
   * repaints drops the gesture, which feels like the handle "slipping".
   *
   * The maths is in PERCENT of the containing column, not pixels: the
   * measure is fluid, and a picture pinned to 420px is half the column
   * on a laptop and wider than the screen on a phone.
   *
   * Both bottom corners resize; which one you grab only decides whether
   * the width grows with or against the pointer, so a right-aligned
   * picture still grows toward the text the way it looks like it should.
   */
  const startResize = (e: React.PointerEvent, handle: Handle) => {
    // Without this the editor takes the pointerdown as a click on the
    // node and starts a text selection mid-drag.
    e.preventDefault();
    e.stopPropagation();

    const box = frame.current;
    const column = measurableParent(box);
    if (!box || !column) return;

    const columnWidth = column.clientWidth || 1;
    const rect = box.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    /* THREE GESTURES, DECIDED BY WHICH GRIP WAS TAKEN.
         corner  scale — the whole picture gets bigger or smaller and
                 keeps its proportions
         w / e   crop the sides — the frame narrows at the SAME height,
                 so the photograph is trimmed left and right
         n / s   crop top and bottom — the frame shortens at the same
                 width
       Corners are square and edges are round, so the two behaviours are
       told apart before they are used rather than after. */
    const kind: "scale" | "cropX" | "cropY" =
      handle === "n" || handle === "s"
        ? "cropY"
        : handle === "e" || handle === "w"
          ? "cropX"
          : "scale";

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(kind === "scale" ? "width" : "crop");

    const asPercent = (px: number) =>
      Math.min(
        RICH_IMAGE_WIDTH_MAX,
        Math.max(RICH_IMAGE_WIDTH_MIN, Math.round((px / columnWidth) * 100)),
      );

    const move = (ev: PointerEvent) => {
      if (kind === "cropY") {
        const dy = handle === "s" ? ev.clientY - startY : startY - ev.clientY;
        const height = Math.max(24, startHeight + dy);
        updateAttributes({ crop: imageAspect(startWidth / height) });
        return;
      }

      const dx = handle.includes("e") ? ev.clientX - startX : startX - ev.clientX;
      const px = Math.max(24, startWidth + dx);

      if (kind === "cropX") {
        /* Narrowing the frame while HOLDING THE HEIGHT is what makes
           this a crop of the sides rather than a shrink of the picture.
           Both numbers have to move together: the frame's height is
           width ÷ aspect, so keeping the height fixed while the width
           changes means the aspect must change by the same factor. */
        updateAttributes({ width: asPercent(px), crop: imageAspect(px / startHeight) });
        return;
      }

      updateAttributes({ width: asPercent(px) });
    };
    const stop = () => {
      setDragging(null);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  useEffect(() => {
    if (!assetId) return;
    let live = true;
    const sync = () => {
      if (live) setRow(peekAsset(assetId));
    };
    const off = onAssetsChanged(sync);
    void loadAsset(assetId).then((r) => {
      if (!live) return;
      if (r) setRow(r);
      else setGone(true);
    });
    return () => {
      live = false;
      off();
    };
  }, [assetId]);

  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      className={`rt-figure rt-figure-${align} rt-node${selected ? " rt-node-selected" : ""}`}
      // The same custom property the renderer emits, so the box and the
      // published page size a picture through identical CSS. A cast
      // because React's CSSProperties has no room for custom properties.
      style={
        {
          ...(width ? { "--rt-w": `${width}%` } : {}),
          ...(crop ? { "--rt-ar": String(crop) } : {}),
        } as React.CSSProperties
      }
      data-drag-handle
    >
      <div
        className="rt-frame cursor-pointer"
        ref={frame}
        onClick={(e) => {
          if (!selected && editable) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === "function") {
              const pos = getPos();
              if (typeof pos === "number") {
                editor.chain().setNodeSelection(pos).run();
              }
            }
          }
        }}
      >
        {gone ? (
          <p className="border border-dashed border-line-strong bg-bg-inset p-4 text-body-s text-text-secondary">
            This photograph is no longer in the library — it was probably deleted. It will not
            appear on the published page.
          </p>
        ) : row ? (
          <img
            src={assetUrl(row)}
            alt={alt || row.alt}
            width={row.width}
            height={row.height}
            className="block h-auto w-full"
            draggable={false}
          />
        ) : (
          <div className="flex min-h-32 items-center justify-center border border-dashed border-line-hairline bg-bg-inset text-body-s text-text-tertiary">
            Loading the photograph…
          </div>
        )}

        {/* The handles live on the picture, not in the toolbar, because
            that is where the hand already is. Shown only on selection so
            a column of photographs is not a column of grab dots. */}
        {editable && selected && row ? (
          <>
            {HANDLES.map((h) => (
              <span
                key={h}
                role="presentation"
                title={
                  h === "n" || h === "s"
                    ? "Drag to crop the top and bottom"
                    : h === "e" || h === "w"
                      ? "Drag to crop the sides"
                      : "Drag to resize the whole picture"
                }
                className={`rt-handle rt-h-${h}`}
                onPointerDown={(e) => startResize(e, h)}
              />
            ))}
            {/* The number, while dragging. Resizing by eye is fine until
                you want the next picture to match this one. */}
            {dragging ? (
              <span className="rt-size-badge">
                {dragging === "width" ? `${width ?? 100}%` : "cropping"}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {editable && selected ? (
        <div
          // rt-toolbar breaks out of the figure's width — at 25% the
          // controls would otherwise be stacked into a column narrower
          // than one button.
          className="rt-toolbar flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => {
            // Prevent dropping ProseMirror selection when clicking toolbar
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {RICH_IMAGE_ALIGNS.map((a) => (
            <button
              key={a}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ align: a });
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ align: a });
              }}
              aria-pressed={align === a}
              className={`border px-2 py-1 text-micro uppercase transition-colors ${
                align === a
                  ? "border-accent text-text-primary"
                  : "border-line-hairline text-text-secondary hover:text-text-primary"
              }`}
            >
              {a}
            </button>
          ))}

          <span aria-hidden="true" className="h-5 w-px bg-line-hairline" />

          {/* Sizes as buttons, not only as drag handles. Matching two
              photographs by dragging is guesswork; two set to M are
              identical. */}
          {RICH_IMAGE_SIZES.map((sz) => {
            const active = width === sz.pct;
            return (
              <button
                key={sz.id}
                type="button"
                title={sz.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ width: sz.pct });
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ width: sz.pct });
                }}
                aria-pressed={active}
                className={`border px-2 py-1 text-micro uppercase transition-colors ${
                  active
                    ? "border-accent text-text-primary"
                    : "border-line-hairline text-text-secondary hover:text-text-primary"
                }`}
              >
                {sz.id}
              </button>
            );
          })}

          {/* Only when there is a crop to undo — dragging the top edge
              back to exactly the photograph's own height is not a thing
              anyone can do by hand. */}
          {crop ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ crop: null });
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ crop: null });
              }}
              className="border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              Uncrop
            </button>
          ) : null}

          {/* NO DESCRIPTION FIELD HERE, DELIBERATELY.
              The photograph already carries an alt written once in the
              library, and that is the one the renderer falls back to
              (see render.ts). A second box asking for the same sentence
              on every insertion was a text input sitting in the middle
              of a row of four-character buttons — it dominated the
              toolbar and got ignored. Any per-article alt already stored
              on a node is still honoured; there is just no longer a way
              to add another one from here. */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsImage = Node.create({
  name: "brsImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      assetId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-asset-id"),
        renderHTML: (a: Record<string, unknown>) =>
          a.assetId ? { "data-asset-id": String(a.assetId) } : {},
      },
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? "center",
        renderHTML: (a: Record<string, unknown>) => ({ "data-align": String(a.align ?? "center") }),
      },
      alt: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-alt"),
        renderHTML: (a: Record<string, unknown>) => (a.alt ? { "data-alt": String(a.alt) } : {}),
      },
      /** Percent of the column. Null means the full width it would take
       *  anyway, so the commonest case stores nothing. */
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => imageWidth(el.getAttribute("data-width")),
        renderHTML: (a: Record<string, unknown>) => {
          const w = imageWidth(a.width);
          return w ? { "data-width": String(w) } : {};
        },
      },
      /** The frame's aspect ratio when it has been cropped shorter than
       *  the photograph. Null is "as tall as the picture really is". */
      crop: {
        default: null,
        parseHTML: (el: HTMLElement) => imageAspect(el.getAttribute("data-crop")),
        renderHTML: (a: Record<string, unknown>) => {
          const c = imageAspect(a.crop);
          return c ? { "data-crop": String(c) } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-asset-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { class: "rt-figure" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

/* ══ BrsLead ══════════════════════════════════════════════════════════
 *
 * LINE SPACING, PER PARAGRAPH.
 *
 * Not a mark and not a node: an attribute added to the paragraph and
 * heading types that already exist, which is what TextAlign does two
 * lines below it in RICH_EXTENSIONS and for the same reason. Leading is
 * a property of a BLOCK — half a paragraph cannot be set at 1.5 — so
 * storing it on the block is the only shape that cannot express
 * something the renderer would have to throw away.
 *
 * `addGlobalAttributes` rather than re-declaring the nodes: redefining
 * Paragraph would mean forking StarterKit's copy of it and inheriting
 * the maintenance of a node we have no other reason to own.
 *
 * NO CUSTOM COMMAND COMES WITH IT. A `setLead` was written first and
 * removed: it did nothing that chaining the built-in `updateAttributes`
 * over the two types does not do, and declaring it meant augmenting
 * `@tiptap/core`'s Commands interface — a module this app does not
 * depend on directly and cannot name in a `declare module` block. The
 * Toolbar chains the built-in instead. `updateAttributes` only touches
 * nodes of that type inside the selection, so selecting three
 * paragraphs and a heading sets all four and the types that are not
 * there are no-ops.
 */
export const BrsLead = Extension.create({
  name: "brsLead",

  addOptions() {
    return { types: ["paragraph", "heading"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          lead: {
            default: null,
            // richLead snaps to the four offered values, so a document
            // that has been edited by hand cannot introduce a fifth.
            parseHTML: (el: HTMLElement) => richLead(el.getAttribute("data-lead")),
            /* BOTH a data attribute and the custom property, on purpose.
               `data-lead` is what parseHTML reads back, so copy-paste
               inside the editor keeps the spacing. `--rt-lh` is what
               actually does the spacing, and it is the SAME property
               render.ts writes onto the published paragraph — so one
               rule in globals.css styles the draft and the page, rather
               than two rules that drift. */
            renderHTML: (a: Record<string, unknown>) => {
              const lead = richLead(a.lead);
              return lead
                ? {
                    "data-lead": String(lead),
                    // The class is what collapses the 24px gap between
                    // two paragraphs that both carry a spacing — see
                    // `.rt-lead + .rt-lead` in globals.css. Without it
                    // the leading changes and the paragraph gap does
                    // not, which is how "Single" ended up looking
                    // looser than the default it replaced.
                    class: "rt-lead",
                    style: `--rt-lh:${lead}`,
                  }
                : {};
            },
          },
        },
      },
    ];
  },

});

/* ══ BrsEmbed ═════════════════════════════════════════════════════════ */

/**
 * A VIDEO YOU CAN WATCH WITHOUT LEAVING THE EDITOR.
 *
 * This was a description of a video — thumbnail, provider, id — on the
 * reasoning that an editor only needs to confirm WHICH video they
 * pasted. That is true right up until somebody wants to check they
 * pasted the right one, at which point a card that cannot be played is
 * a card that sends them to YouTube in another tab to find out.
 *
 * Pressing play mounts the same iframe, from the same hardcoded origin,
 * that the published page mounts when a reader presses play there. The
 * card is the poster; the iframe replaces it in place.
 *
 * `contentEditable={false}` on the shell is what makes an iframe safe
 * inside a contenteditable: without it the browser will happily let a
 * caret land between the frame and its container, and ProseMirror will
 * then try to reconcile a DOM it does not own.
 */
function EmbedView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const provider = node.attrs.provider as string;
  const videoId = node.attrs.videoId as string;
  const title = (node.attrs.title as string | null) ?? "";
  const width = imageWidth(node.attrs.width) ?? RICH_EMBED_DEFAULT_WIDTH;
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const src = isProvider(provider) ? embedSrc(provider, videoId) : null;

  /**
   * DRAG A BOTTOM CORNER TO RESIZE — the same gesture, the same maths
   * and the same handles as a photograph, because to a writer it is the
   * same act.
   *
   * ONE DIFFERENCE, AND IT IS NOT AN OVERSIGHT: a video has no crop.
   * The picture's edge handles trim the frame and let the photograph
   * sit behind it at its true proportions; a video is 16:9 and a
   * letterboxed video in a cropped frame is just a smaller video with
   * black bars we drew ourselves. So the corners scale and there are no
   * edge handles.
   */
  const startResize = (e: React.PointerEvent, handle: "sw" | "se") => {
    e.preventDefault();
    e.stopPropagation();

    const box = frame.current;
    const column = measurableParent(box);
    if (!box || !column) return;

    const columnWidth = column.clientWidth || 1;
    const startX = e.clientX;
    const startWidth = box.getBoundingClientRect().width;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);

    const move = (ev: PointerEvent) => {
      const dx = handle === "se" ? ev.clientX - startX : startX - ev.clientX;
      const px = Math.max(24, startWidth + dx);
      updateAttributes({
        width: Math.min(
          RICH_IMAGE_WIDTH_MAX,
          Math.max(RICH_IMAGE_WIDTH_MIN, Math.round((px / columnWidth) * 100)),
        ),
      });
    };
    const stop = () => {
      setDragging(false);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  const editable = editor.isEditable;
  const label = title || (provider === "youtube" ? "YouTube video" : "Vimeo video");

  return (
    <NodeViewWrapper
      /* `relative` is load-bearing: .rt-toolbar is positioned at
         `top: 100%` and anchors to the nearest positioned ancestor.
         A picture gets that from `.adm-richtext-body .rt-figure`;
         this node has no such rule, and without it the size buttons
         fly off to whatever ancestor happens to be positioned. */
      className="rt-node relative block"
      // The same custom property the renderer emits, so the box while
      // writing and the box on the page are sized by identical CSS.
      style={{ "--rt-w": `${width}%` } as React.CSSProperties}
    >
      {/* THE PUBLISHED CLASSES, NOT A LOOKALIKE. `.rt-embed` and its
          three children are the same rules globals.css gives the
          article, so the box being dragged here is the box that
          publishes — at the same width, the same 16:9, the same poster
          and the same play button. A separate admin card was what this
          was before, and it could not answer "how big will this be?"
          because it was never the same shape as the answer. */}
      <div
        ref={frame}
        contentEditable={false}
        className={`rt-embed${selected ? " rt-node-selected" : ""}`}
      >
        {playing && src ? (
          <iframe
            src={`${src}&autoplay=1`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="rt-embed-play"
            onClick={() => setPlaying(true)}
            disabled={!src}
            title="Play this video here"
          >
            {provider === "youtube" ? (
              // Admin-only in the sense that matters: the published page
              // asks for the same file, so this costs the editor nothing
              // the reader is not already paying.
              <img
                className="rt-embed-poster"
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                width={480}
                height={360}
                referrerPolicy="no-referrer"
              />
            ) : null}
            <span className="rt-embed-icon" aria-hidden="true" />
            <span className="rt-embed-label">{label}</span>
          </button>
        )}

        {/* Same reasoning as PdfView's grip: once `playing` is true this
            box is almost entirely a live <iframe>, and a drag gesture
            that starts inside an iframe's own document never reaches
            the parent page. Before playing, the facade is a real
            <button> in our own DOM and dragging it already worked —
            this grip is what keeps that true after the click. */}
        {editable ? (
          <span
            role="presentation"
            title="Drag to move this block"
            data-drag-handle
            className={`rt-drag-grip${selected ? " rt-drag-grip-visible" : ""}`}
          >
            <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
              <circle cx="2" cy="2" r="1.4" />
              <circle cx="8" cy="2" r="1.4" />
              <circle cx="2" cy="8" r="1.4" />
              <circle cx="8" cy="8" r="1.4" />
              <circle cx="2" cy="14" r="1.4" />
              <circle cx="8" cy="14" r="1.4" />
            </svg>
          </span>
        ) : null}

        {/* Both bottom corners, as on a photograph — which one is
            grabbed only decides whether the width grows with or against
            the pointer. No edge handles: a video has no crop. */}
        {editable && selected ? (
          <>
            {(["sw", "se"] as const).map((h) => (
              <span
                key={h}
                role="presentation"
                title="Drag to resize the video"
                className={`rt-handle rt-h-${h}`}
                onPointerDown={(e) => startResize(e, h)}
              />
            ))}
            {dragging ? <span className="rt-size-badge">{width}%</span> : null}
          </>
        ) : null}
      </div>

      {editable && selected ? (
        <div
          className="rt-toolbar rt-toolbar-center flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* The same four sizes a picture gets, and the same reason for
              having them: two videos in one article cannot be matched by
              eye, and most of the time the writer wants "small", not a
              number. */}
          {RICH_IMAGE_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateAttributes({ width: s.pct });
              }}
              aria-pressed={width === s.pct}
              title={`${s.label} — ${s.pct}% of the column`}
              className={`border px-2 py-1 text-micro uppercase transition-colors ${
                width === s.pct
                  ? "border-accent text-text-primary"
                  : "border-line-hairline text-text-secondary hover:border-line-strong hover:text-text-primary"
              }`}
            >
              {s.id}
            </button>
          ))}

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-hairline" />

          <span className="font-mono text-micro uppercase text-text-tertiary">
            {width}% · {provider}
          </span>

          {playing ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPlaying(false);
              }}
              className="border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsEmbed = Node.create({
  name: "brsEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-provider"),
        renderHTML: (a: Record<string, unknown>) => ({ "data-provider": String(a.provider ?? "") }),
      },
      videoId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-video-id"),
        renderHTML: (a: Record<string, unknown>) => ({ "data-video-id": String(a.videoId ?? "") }),
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-title"),
        renderHTML: (a: Record<string, unknown>) => (a.title ? { "data-title": String(a.title) } : {}),
      },
      /* Percent of the column, exactly as a picture stores it —
         `imageWidth` clamps both. Null means "the default", which is
         what an embed made before this attribute existed holds. */
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-width"),
        renderHTML: (a: Record<string, unknown>) =>
          a.width ? { "data-width": String(a.width) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-provider][data-video-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "rt-embed" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});

/* ══ BrsPdf ═══════════════════════════════════════════════════════════ */

/**
 * A PDF, EMBEDDED WITH THE READER'S OWN VIEWER.
 *
 * Unlike BrsEmbed there is no facade-then-swap: a video's iframe points
 * at a third-party origin (youtube.com), so it is deferred behind a
 * click for the same reason a page never autoplays a stranger's script.
 * A PDF's iframe points at OUR OWN storage — the same origin every
 * photograph on the page already loads from — so there is nothing to
 * defer. The browser's built-in viewer (Firefox's PDF.js, Chrome's,
 * Edge's) renders it the instant the src is set, which is the entire
 * feature: nobody had to build a page-flipping UI, the browser already
 * has one.
 *
 * `contentEditable={false}` on the shell, same reason as the video: an
 * iframe inside a contenteditable needs to be walled off from the
 * caret, or ProseMirror will try to reconcile DOM it does not own.
 */
function PdfView({
  node,
  deleteNode,
  selected,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const documentId = node.attrs.documentId as string;
  const titleAttr = (node.attrs.title as string | null) ?? "";
  const height = (node.attrs.height as number | null) ?? DEFAULT_PDF_HEIGHT;
  const leftEdge = (node.attrs.leftEdge as number | null) ?? DEFAULT_PDF_LEFT_EDGE;
  const rightEdge = (node.attrs.rightEdge as number | null) ?? DEFAULT_PDF_RIGHT_EDGE;
  const align = (node.attrs.align as PdfAlign | null) ?? DEFAULT_PDF_ALIGN;
  const width = rightEdge - leftEdge;
  const [doc, setDoc] = useState(() => peekDocument(documentId));
  const [dragging, setDragging] = useState<"left" | "right" | "height" | "scale" | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doc) return;
    void loadDocument(documentId).then(setDoc);
    return onDocumentsChanged(() => setDoc(peekDocument(documentId)));
  }, [documentId, doc]);

  /**
   * TWO INDEPENDENT EDGES, NOT ONE WIDTH.
   *
   * The earlier version stored a single `width` and relied on CSS
   * float to pin whichever side the float direction implied — which
   * meant only ONE edge could ever be draggable at a time; the other
   * was wherever the float put it, full stop. That's a real CSS
   * constraint, not a bug, but it also isn't what a person resizing a
   * box actually wants: drag the left edge, the right edge should stay
   * exactly where it was, and vice versa — independently, regardless
   * of alignment.
   *
   * So the box's horizontal extent is now genuinely two numbers,
   * `leftEdge` and `rightEdge` (both a % of the column, 0–100), not
   * one. Dragging "w" moves ONLY leftEdge; dragging "e" moves ONLY
   * rightEdge. Whichever one you're not dragging is untouched by
   * definition, because it's a different stored number.
   *
   * Height still only grows downward — see the comment on
   * visibleHandlesForAlign below for why that one's a real CSS limit
   * that two-edge tracking doesn't change (there's no equivalent
   * "topEdge" that would mean anything for a box positioned by normal
   * document flow rather than absolute coordinates).
   */
  const startResize = (e: React.PointerEvent, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();

    const box = frame.current;
    const column = measurableParent(box);
    if (!box || !column) return;

    const columnWidth = column.clientWidth || 1;
    const rect = box.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startHeightPx = rect.height;
    const startLeftEdge = leftEdge;
    const startRightEdge = rightEdge;
    const aspect = startHeightPx / rect.width;

    const kind: "scale" | "left" | "right" | "height" =
      handle === "se" ? "scale" : handle === "s" ? "height" : handle.includes("w") ? "left" : "right";

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(kind === "scale" ? "scale" : kind);

    const clampHeight = (px: number) =>
      Math.min(PDF_HEIGHT_MAX, Math.max(PDF_HEIGHT_MIN, Math.round(px)));
    const toPercent = (px: number) => (px / columnWidth) * 100;

    const move = (ev: PointerEvent) => {
      if (kind === "height") {
        // Bottom-anchored only — see visibleHandlesForAlign's comment
        // for why "north" was removed entirely rather than fixed.
        const dy = ev.clientY - startY;
        updateAttributes({ height: clampHeight(startHeightPx + dy) });
        return;
      }

      const dxPct = toPercent(ev.clientX - startX);

      if (kind === "left") {
        // Only leftEdge moves. rightEdge is a different stored number
        // and this branch never touches it — that IS the fix.
        const next = Math.min(
          Math.max(0, startLeftEdge + dxPct),
          startRightEdge - PDF_MIN_WIDTH_PCT,
        );
        updateAttributes({ leftEdge: Math.round(next) });
        return;
      }

      if (kind === "right") {
        const next = Math.max(
          Math.min(100, startRightEdge + dxPct),
          startLeftEdge + PDF_MIN_WIDTH_PCT,
        );
        updateAttributes({ rightEdge: Math.round(next) });
        return;
      }

      // "scale" — the one remaining corner (se): right edge and height
      // move together, aspect preserved, left edge untouched — the
      // same "bigger, not squashed" idea the old single-width version
      // had, just anchored on the side that's actually fixed here too.
      const nextRight = Math.max(
        Math.min(100, startRightEdge + dxPct),
        startLeftEdge + PDF_MIN_WIDTH_PCT,
      );
      const nextWidthPx = ((nextRight - startLeftEdge) / 100) * columnWidth;
      updateAttributes({
        rightEdge: Math.round(nextRight),
        height: clampHeight(nextWidthPx * aspect),
      });
    };
    const stop = () => {
      setDragging(null);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  const label = titleAttr || doc?.title || "PDF document";
  const src = doc ? documentUrl(doc) : null;
  const editable = editor.isEditable;

  /**
   * MARGIN + WIDTH, ALWAYS INLINE — no CSS variable, no percentage
   * class doing the math. `leftEdge`/`rightEdge` are computed here,
   * once, into the exact numbers CSS needs; globals.css's
   * .rt-pdf-left/-right/-center classes now only set `float`/`clear`
   * (which side text wraps on), nothing about size or position — that
   * ambiguity between "which file sets the actual number" was part of
   * how the earlier compounding bug happened in the first place.
   *
   * The margin on the POSITIONING side (marginLeft for left/center,
   * marginRight for right) IS the box's stored position — that one has
   * to be exact. The margin on the OPPOSITE side is a fixed gutter
   * (var(--spacing-6)), same as the write-up editor's picture float
   * already uses, so wrapped text doesn't run flush against the box's
   * edge; centered boxes get no gutter on either side, matching how
   * they never had one before (nothing wraps beside a centered box to
   * begin with).
   */
  const boxStyle: React.CSSProperties =
    align === "right"
      ? { marginRight: `${100 - rightEdge}%`, marginLeft: "var(--spacing-6)", width: `${width}%` }
      : align === "left"
        ? { marginLeft: `${leftEdge}%`, marginRight: "var(--spacing-6)", width: `${width}%` }
        : { marginLeft: `${leftEdge}%`, width: `${width}%` };

  return (
    <NodeViewWrapper className="rt-node relative block">
      <div contentEditable={false} className={`rt-pdf rt-pdf-${align}`} style={boxStyle}>
        <div
          ref={frame}
          className={`rt-frame rt-pdf-frame-outer${selected ? " rt-node-selected" : ""}`}
          style={{ height: `${height}px` }}
        >
          {src ? (
            <iframe src={src} title={label} className="rt-pdf-frame" />
          ) : (
            <div className="rt-pdf-missing">
              {doc === null ? "This PDF is no longer in the library." : "Loading…"}
            </div>
          )}

          {/*
            THE GRIP THAT ACTUALLY MOVES THE BLOCK.
            `data-drag-handle` used to sit on the whole NodeViewWrapper,
            which in principle makes any part of it a drag origin — but
            in practice, almost the entire visible box IS the <iframe>,
            and a pointer gesture that starts inside an iframe's own
            document never reaches the parent page's dragstart handling
            at all. The two thin strips that were left (a few pixels of
            border, the caption row) were not a discoverable place to
            grab a block from. This dot grid is deliberately never over
            the iframe — top-left, entirely on our own DOM — so a drag
            always has somewhere real to start from. */}
          {editable ? (
            <span
              role="presentation"
              title="Drag to move this block"
              data-drag-handle
              className={`rt-drag-grip${selected ? " rt-drag-grip-visible" : ""}`}
            >
              <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                <circle cx="2" cy="2" r="1.4" />
                <circle cx="8" cy="2" r="1.4" />
                <circle cx="2" cy="8" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="2" cy="14" r="1.4" />
                <circle cx="8" cy="14" r="1.4" />
              </svg>
            </span>
          ) : null}

          {editable && selected ? (
            <>
              {visibleHandlesForAlign(align).map((h) => (
                <span
                  key={h}
                  role="presentation"
                  title={
                    h === "s"
                      ? "Drag to change the height"
                      : h === "w"
                        ? "Drag — only the left edge moves"
                        : h === "e"
                          ? "Drag — only the right edge moves"
                          : "Drag to resize the whole box"
                  }
                  className={`rt-handle rt-h-${h}`}
                  onPointerDown={(e) => startResize(e, h)}
                />
              ))}
              {dragging ? (
                <span className="rt-size-badge">
                  {dragging === "height"
                    ? `${height}px`
                    : dragging === "left"
                      ? `left ${Math.round(leftEdge)}%`
                      : dragging === "right"
                        ? `right ${Math.round(rightEdge)}%`
                        : `${Math.round(width)}%`}
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="rt-pdf-caption">
          <span className="rt-pdf-title">{label}</span>
          {src ? (
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open in a new tab
            </a>
          ) : null}
        </div>
      </div>

      {editable && selected ? (
        <div
          className="rt-toolbar rt-toolbar-center flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span className="font-mono text-micro uppercase text-text-primary">{label}</span>
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (a === "center") {
                  // Centering used to be CSS's job (margin-inline: auto),
                  // which kept re-balancing on its own forever — exactly
                  // the behaviour that made independent left/right
                  // dragging impossible while centered. Now it's a
                  // one-time placement: figure out where centered would
                  // put this box AT ITS CURRENT WIDTH, store that as
                  // plain leftEdge/rightEdge, and from then on it's a
                  // normal, freely-draggable position that happens to
                  // start centered — the same way clicking "center" in
                  // PowerPoint doesn't lock an object to the middle
                  // forever, it just puts it there once.
                  const half = (100 - width) / 2;
                  updateAttributes({
                    align: a,
                    leftEdge: Math.max(0, Math.round(half)),
                    rightEdge: Math.min(100, Math.round(half + width)),
                  });
                } else {
                  updateAttributes({ align: a });
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-pressed={align === a}
              title={
                a === "left"
                  ? "Left — text can wrap on the right"
                  : a === "right"
                    ? "Right — text can wrap on the left"
                    : "Centered — always starts its own row"
              }
              className={`border px-2 py-1 text-micro uppercase transition-colors ${
                align === a
                  ? "border-accent bg-bg-base text-text-primary"
                  : "border-transparent text-text-secondary hover:border-line-hairline hover:text-text-primary"
              }`}
            >
              {a}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="border border-line-hairline px-2 py-1 text-micro uppercase text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/** 32rem at the default 16px root — the height a freshly inserted PDF
 *  gets, until it's dragged. */
export const DEFAULT_PDF_HEIGHT = 512;
/** Full width by default (0 to 100) — matches how a PDF used to always
 *  render, before it became resizable. */
export const DEFAULT_PDF_LEFT_EDGE = 0;
export const DEFAULT_PDF_RIGHT_EDGE = 100;

export type PdfAlign = "left" | "center" | "right";
/** Left, not center — same reasoning RICH_IMAGE_DEFAULT_ALIGN gives for
 *  a picture (see palette.ts): a centred box always clears onto its own
 *  row (see .rt-pdf-center's CSS comment), so it can never sit beside
 *  text no matter how narrow it's resized. Left is the one alignment
 *  where shrinking the box and having a paragraph wrap into the space
 *  that opens up next to it — the thing this was actually asked for —
 *  is even possible. */
export const DEFAULT_PDF_ALIGN: PdfAlign = "left";

/**
 * WHICH HANDLES CORRESPOND TO AN EDGE THAT CAN ACTUALLY MOVE.
 *
 * Now that both edges are independently stored, width is no longer the
 * limit — "w" and "e" are available for every alignment; dragging one
 * only ever changes its own edge, the other stays exactly where it
 * was, regardless of left/center/right.
 *
 * Height is the one direction that's still genuinely constrained: the
 * box has no `top` coordinate, only a position in normal document
 * flow, so there is no equivalent "topEdge" number that would mean
 * anything — extra height can only ever appear below the box. That's
 * why "n" (and the two corners that would combine it with a horizontal
 * drag, "nw"/"ne") are never offered, for any alignment.
 */
function visibleHandlesForAlign(_align: PdfAlign): readonly Handle[] {
  void _align;
  return ["w", "e", "s", "sw", "se"];
}

const PDF_MIN_WIDTH_PCT = 15;
const PDF_HEIGHT_MIN = 200;
const PDF_HEIGHT_MAX = 1600;

export const BrsPdf = Node.create({
  name: "brsPdf",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-document-id"),
        renderHTML: (a: Record<string, unknown>) =>
          a.documentId ? { "data-document-id": String(a.documentId) } : {},
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-title"),
        renderHTML: (a: Record<string, unknown>) =>
          a.title ? { "data-title": String(a.title) } : {},
      },
      height: {
        default: DEFAULT_PDF_HEIGHT,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-height");
          const n = raw ? Number(raw) : NaN;
          return Number.isFinite(n) && n > 0
            ? Math.min(PDF_HEIGHT_MAX, Math.max(PDF_HEIGHT_MIN, n))
            : DEFAULT_PDF_HEIGHT;
        },
        renderHTML: (a: Record<string, unknown>) =>
          a.height ? { "data-height": String(a.height) } : {},
      },
      leftEdge: {
        default: DEFAULT_PDF_LEFT_EDGE,
        // Falls back to reading the OLD `data-width` attribute (from
        // before this became two edges) as leftEdge=0, so a PDF
        // inserted before this change still renders at a sane size
        // instead of collapsing — see rightEdge's parseHTML for the
        // other half of that fallback.
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-left-edge");
          const n = raw ? Number(raw) : NaN;
          return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_PDF_LEFT_EDGE;
        },
        renderHTML: (a: Record<string, unknown>) =>
          a.leftEdge != null ? { "data-left-edge": String(a.leftEdge) } : {},
      },
      rightEdge: {
        default: DEFAULT_PDF_RIGHT_EDGE,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-right-edge");
          const n = raw ? Number(raw) : NaN;
          if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
          // Old documents: data-width was leftEdge(0) + width, so it
          // converts directly to a rightEdge.
          const legacyWidth = Number(el.getAttribute("data-width"));
          return Number.isFinite(legacyWidth) && legacyWidth > 0
            ? Math.min(100, legacyWidth)
            : DEFAULT_PDF_RIGHT_EDGE;
        },
        renderHTML: (a: Record<string, unknown>) =>
          a.rightEdge != null ? { "data-right-edge": String(a.rightEdge) } : {},
      },
      align: {
        default: DEFAULT_PDF_ALIGN,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-align");
          return raw === "left" || raw === "center" || raw === "right" ? raw : DEFAULT_PDF_ALIGN;
        },
        renderHTML: (a: Record<string, unknown>) =>
          a.align ? { "data-align": String(a.align) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-document-id]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const align = (node.attrs.align as PdfAlign | null) ?? DEFAULT_PDF_ALIGN;
    return ["div", mergeAttributes(HTMLAttributes, { class: `rt-pdf rt-pdf-${align}` })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfView);
  },
});

/* ══ The assembled set ════════════════════════════════════════════════
 *
 * Deliberate omissions, each because render.ts has no way to publish it
 * and a button that silently does nothing is worse than its absence:
 *
 *   codeBlock   the inline `code` mark covers what a club write-up needs
 *   h1          belongs to the page title; a body starts at h2
 *   h4-h6       three levels of heading is already more than any of
 *               these articles has ever used
 */
/**
 * BACKSPACE SHOULD BE ABLE TO CLOSE THE GAP A MEDIA INSERT LEAVES.
 *
 * Inserting a picture, a video, or a PDF mid-document splits the
 * surrounding paragraph and leaves a fresh, empty paragraph on the far
 * side of it for the caret to land in (see BrsPdf's own insert()
 * comment in dialogs.tsx for why that split happens at all). Without
 * this extension, pressing Backspace at the very start of that empty
 * paragraph hits ProseMirror's own default "joinBackward" behaviour —
 * which, immediately before an ATOM node, does not delete anything on
 * the first press. It SELECTS the atom (turns it into a NodeSelection),
 * so what looks like "nothing happened" is actually "the picture is now
 * selected", and a second, unwanted Backspace would delete the picture
 * itself rather than the empty line.
 *
 * This intercepts that specific situation — empty paragraph, cursor at
 * its very start, a media block immediately before it — and instead
 * deletes ONLY the empty paragraph, leaving the media block untouched
 * and the caret landing back at the end of whatever came before it.
 * Every other Backspace (mid-text, in a non-empty paragraph, not next
 * to a media block) falls through to ProseMirror's normal handling
 * unchanged, since this returns `false` for all of those.
 */
const MEDIA_NODE_TYPES = new Set(["brsImage", "brsEmbed", "brsPdf"]);

export const BrsMediaBackspace = Extension.create({
  name: "brsMediaBackspace",

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (!selection.empty) return false;

        const { $from } = selection;
        if ($from.parent.type.name !== "paragraph") return false;
        if ($from.parent.content.size !== 0) return false;
        if ($from.parentOffset !== 0) return false;

        const before = $from.before();
        if (before <= 0) return false;
        const nodeBefore = state.doc.resolve(before).nodeBefore;
        if (!nodeBefore || !MEDIA_NODE_TYPES.has(nodeBefore.type.name)) return false;

        const paragraphEnd = before + $from.parent.nodeSize;
        editor.view.dispatch(state.tr.delete(before, paragraphEnd));
        return true;
      },
    };
  },
});

export const RICH_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      // The renderer drops anything that is not http(s), mailto or a
      // site-relative path. Matching that here means the editor cannot
      // create a link the page will refuse to publish.
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  TextAlign.configure({
    types: ["paragraph", "heading"],
    alignments: [...RICH_ALIGNS],
  }),
  Placeholder.configure({
    // An empty box that says nothing looks broken rather than empty.
    placeholder: "Write about what happened…",
  }),
  KeepPendingMarks,
  BrsLead,
  BrsMediaBackspace,
  BrsStyle,
  BrsImage,
  BrsEmbed,
  BrsPdf,
];
