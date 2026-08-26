"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WHAT TIPTAP DOES NOT SHIP.
 *
 * StarterKit already gives us bold, italic, underline, strike, code,
 * links, both lists, headings, quote, rule and undo — so those are
 * configured, not written. What is here is the pieces that have to know
 * about THIS site.
 *
 * ── THE WRITE-UP: formatting an account of something that happened ──
 *   BrsStyle   font / size / colour / highlight, stored as TOKEN NAMES
 *              rather than CSS, for the reasons in lib/richtext/palette.ts
 *   BrsLead    line spacing, as an attribute on the block that has it
 *   BrsImage   an inline photograph, stored as an ASSET ID so it keeps
 *              the derivatives, the EXIF strip and the content-addressing
 *   BrsEmbed   a video, stored as PROVIDER + ID so no third-party markup
 *              is ever held or trusted
 *
 * ── THE ANNOUNCEMENT: laying out a page for something that has not ──
 *   BrsButton  a call to action, stored as LABEL + HREF + a variant NAME
 *   BrsColumns a row of two, three or four, stored as a COUNT
 *   BrsCard    one cell of that row, holding real blocks rather than
 *              a title-and-body pair of strings
 *
 * The common thread across all seven: none of them stores a URL where an
 * id would do, or a style where a name would do. A URL bypasses the asset
 * pipeline, a style bypasses the design system, and both bypass the theme
 * flip. Each stores the smallest identifier that lets the renderer build
 * the real thing at publish time.
 * ══════════════════════════════════════════════════════════════════════
 */

import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { NodeSelection, Plugin, PluginKey, Selection, type EditorState } from "@tiptap/pm/state";
import type { Node as PMNodeType, NodeType } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import {
  addColumnAfter,
  addRowAfter,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  mergeCells,
  splitCell,
  tableEditing,
  toggleHeaderRow,
} from "@tiptap/pm/tables";
import {
  Extension,
  Mark,
  Node,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import {
  buttonAttrs,
  buttonColour,
  countdownAt,
  countText,
  countTo,
  richAnim,
  richHover,
  richStagger,
  buttonRadius,
  buttonWeight,
  buttonSize,
  buttonVariant,
  buttonVars,
  calloutTone,
  cellAlign,
  cellVAlign,
  gridDensity,
  gridFreeSpot,
  gridH,
  gridReadingOrder,
  gridRowRem,
  gridW,
  gridWAt,
  gridX,
  gridY,
  type GridBox,
  cardAlign,
  cardVariant,
  columnCount,
  embedSrc,
  imageAspect,
  imageWidth,
  isPdfDataUrl,
  pdfHeight,
  isProvider,
  RICH_ALIGNS,
  RICH_BUTTON_RADIUS_DEFAULT,
  RICH_BUTTON_WEIGHT_DEFAULT,
  RICH_BUTTON_SIZE_DEFAULT,
  RICH_BUTTON_VARIANT_DEFAULT,
  RICH_CALLOUT_TONES,
  RICH_CALLOUT_TONE_DEFAULT,
  RICH_CELL_ALIGNS,
  RICH_CELL_ALIGN_DEFAULT,
  RICH_CELL_VALIGNS,
  RICH_CELL_VALIGN_DEFAULT,
  RICH_GRID_COLS,
  RICH_GRID_DENSITIES,
  RICH_GRID_DENSITY_DEFAULT,
  RICH_GRID_ROWS_MAX,
  RICH_CARD_ALIGNS,
  RICH_CARD_ALIGN_DEFAULT,
  RICH_CARD_VARIANTS,
  RICH_CARD_VARIANT_DEFAULT,
  RICH_COLUMN_COUNTS,
  RICH_COLUMN_COUNT_DEFAULT,
  RICH_EMBED_DEFAULT_WIDTH,
  RICH_HEADING_LEVELS,
  RICH_ICONS,
  RICH_IMAGE_ALIGNS,
  RICH_IMAGE_SIZES,
  RICH_IMAGE_WIDTH_MAX,
  RICH_PDF_HEIGHT_DEFAULT,
  RICH_IMAGE_WIDTH_MIN,
  RICH_SECTION_SCRIMS,
  RICH_SECTION_SCRIM_DEFAULT,
  RICH_SECTION_TONES,
  RICH_SECTION_TONE_DEFAULT,
  RICH_SPACER_SIZES,
  RICH_SPACER_SIZE_DEFAULT,
  richIconSvg,
  richLead,
  richStyleAttrs,
  sectionScrim,
  sectionTone,
  spacerSize,
  type RichImageAlign,
} from "@/lib/richtext/palette";
import { assetUrl, type AssetRow } from "../PhotoPicker";
import { loadAsset, onAssetsChanged, peekAsset } from "./asset-cache";
import { BrsDragHandle } from "./drag-handle";

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
    for (const k of ["font", "size", "ink", "mark"] as const) {
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
 * THE BOX THAT ACTUALLY SCROLLS UNDER THE WRITING.
 *
 * Dragging a TOP edge is a lie the layout cannot tell on its own: a
 * block's top is fixed by the flow above it, so making the box taller
 * can only ever push its bottom down. The way every drawing program
 * makes it feel right is to move the page by exactly as much as the box
 * grew, so the edge that was not grabbed stays under the same pixel.
 *
 * Which thing to move depends on the page: the admin editor scrolls the
 * window, but a preview pane scrolls itself, and `window.scrollBy` in
 * that case moves nothing at all.
 */
function scrollingAncestor(el: HTMLElement | null): HTMLElement | null {
  let p: HTMLElement | null = el;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null;
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
      data-drag-handle
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

/* ══ BrsPdf ═══════════════════════════════════════════════════════════
 *
 * THE DOCUMENT ITSELF, NOT ITS NAME.
 *
 * A brief for a workshop, a rulebook for a contest, a schedule — the
 * writer uploads the PDF and the reader sees it, in the browser's own
 * viewer, without leaving the page. Resized by dragging a corner, the
 * same gesture a picture already answers to.
 *
 * ── WHY AN OVERLAY SITS ON THE VIEWER ──
 * The viewer is an <iframe>, and an iframe swallows every pointer event
 * that lands on it — so a click meant to SELECT the block would scroll
 * the PDF instead, and the node could never be picked up to move or
 * resize. The overlay is the fix: while the block is unselected it
 * covers the viewer and takes the click as "select me"; once selected it
 * turns to `pointer-events:none` so the reader can actually use the PDF.
 * One click to select, then it behaves like a PDF.
 */
function PdfView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const name = typeof node.attrs.name === "string" ? node.attrs.name : "";
  const align = isAlignValue(node.attrs.align) ? node.attrs.align : "center";
  const width = imageWidth(node.attrs.width);
  const height = pdfHeight(node.attrs.height);
  const valid = isPdfDataUrl(src);

  const [marginOverride, setMarginOverride] = useState<React.CSSProperties | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<false | "width" | "height">(false);
  const editable = editor.isEditable;

  const select = () => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    if (typeof pos === "number") editor.chain().setNodeSelection(pos).run();
  };

  /**
   * ONE EDGE MOVES, THE OTHER THREE STAY WHERE THEY ARE.
   *
   * That is the whole contract of an edge grip, and it is the only thing
   * that makes a side handle worth having over a corner: drag the right
   * edge and the left one does not budge, so the document stays where
   * the writer put it and only gets wider.
   *
   * ── HOW THE OPPOSITE EDGE IS HELD ──
   * The width is a PERCENTAGE of the column, and a centred figure splits
   * whatever is left over between its two automatic side margins — which
   * is precisely a box that grows from the middle outwards. So before
   * the first pixel of movement, the edge that was NOT grabbed is nailed
   * down as a real margin in pixels and only the far side is left `auto`
   * to take up the slack. From then on the percentage can change freely
   * and the pinned edge cannot move.
   *
   * A LEFT- OR RIGHT-ALIGNED document needs none of this: it is floated,
   * and a float is already held against its own side of the column. It
   * is also the one case where an explicit margin would do harm, because
   * the margin on the text side is the gutter the paragraph wraps
   * against.
   */
  const startHandleResize = (e: React.PointerEvent, handle: Handle) => {
    if (!editable || e.button !== 0) return;
    const box = frame.current;
    /* The COLUMN, which is the figure's parent — not the frame's. The
       frame's parent is the figure itself, and measuring against that
       made every drag a percentage of a box that was itself changing
       size: the number fed back into its own denominator and the width
       ran to its limit on the first few pixels of movement. */
    const figure = box?.parentElement ?? null;
    const column = measurableParent(figure);
    if (!box || !figure || !column) return;
    const rect = box.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const isHeight = handle === "n" || handle === "s";
    const zone = isHeight ? "height" : "width";

    e.preventDefault();
    e.stopPropagation();

    const columnWidth = column.clientWidth || 1;
    const startY = e.clientY;
    const startHeight = rect.height;
    const floating = align === "left" || align === "right";

    /* The edge that stays put, in pixels from the column's own edge. */
    const leftPin = Math.max(0, rect.left - columnRect.left);
    const rightPin = Math.max(0, columnRect.right - rect.right);
    /* …and how far the dragged edge may travel before the box would
       spill out of the column on the pinned side. */
    const maxWidthPx = Math.max(48, columnWidth - (handle === "e" ? leftPin : rightPin));

    if (!floating && handle === "e") {
      setMarginOverride({ marginLeft: `${leftPin}px`, marginRight: "auto" });
    } else if (!floating && handle === "w") {
      setMarginOverride({ marginRight: `${rightPin}px`, marginLeft: "auto" });
    } else if (floating) {
      setMarginOverride(null);
    }

    setDragging(zone);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const shield = document.createElement("div");
    shield.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;cursor:" +
      (zone === "height" ? "ns-resize" : "ew-resize");
    document.body.appendChild(shield);

    const asPercent = (px: number) =>
      Math.min(
        RICH_IMAGE_WIDTH_MAX,
        Math.max(RICH_IMAGE_WIDTH_MIN, Math.round((px / columnWidth) * 100)),
      );

    const scroller = scrollingAncestor(box);
    /* Growing upward is really "grow downward, then move the page down
       by the same amount", so the bottom edge holds still and the top
       edge is the one that follows the pointer. */
    const holdBottomEdge = (heightDiff: number) => {
      if (scroller) scroller.scrollTop += heightDiff;
      else window.scrollBy(0, heightDiff);
    };

    let lastY = startY;
    let currentHeight = startHeight;

    const move = (ev: PointerEvent) => {
      if (handle === "s") {
        const dy = ev.clientY - startY;
        updateAttributes({ height: pdfHeight(startHeight + dy) });
        return;
      }

      if (handle === "n") {
        const stepY = ev.clientY - lastY;
        if (stepY === 0) return;
        lastY = ev.clientY;
        const newHeight = pdfHeight(currentHeight - stepY);
        const heightDiff = newHeight - currentHeight;
        if (heightDiff !== 0) {
          currentHeight = newHeight;
          updateAttributes({ height: newHeight });
          holdBottomEdge(heightDiff);
        }
        return;
      }

      if (handle === "e") {
        /* Measured from the pinned LEFT edge, so the width is whatever
           the pointer has walked out to and the left edge is untouched. */
        const newWidthPx = Math.min(maxWidthPx, Math.max(48, ev.clientX - rect.left));
        updateAttributes({ width: asPercent(newWidthPx) });
        return;
      }

      if (handle === "w") {
        const newWidthPx = Math.min(maxWidthPx, Math.max(48, rect.right - ev.clientX));
        updateAttributes({ width: asPercent(newWidthPx) });
        return;
      }
    };

    const stop = () => {
      setDragging(false);
      shield.remove();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  return (
    <NodeViewWrapper
      className={`rt-figure rt-figure-${align} rt-node${selected ? " rt-node-selected" : ""}`}
      style={
        {
          ...(width ? { "--rt-w": `${width}%` } : {}),
          "--rt-pdf-h": `${height}px`,
          ...(marginOverride || {}),
        } as React.CSSProperties
      }
      data-drag-handle
    >
      <div className="rt-frame rt-pdf-frame" ref={frame}>
        {valid ? (
          <iframe
            src={`${src}#toolbar=1&navpanes=0&view=FitH`}
            title={name || "PDF document"}
            className="rt-pdf-iframe"
          />
        ) : (
          <div className="flex min-h-32 items-center justify-center border border-dashed border-line-strong bg-bg-inset p-4 text-body-s text-text-secondary">
            This PDF could not be read. Remove it and upload the file again.
          </div>
        )}

        {/* When unselected, a cover layer catches the click to select the node */}
        {editable && !selected ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Select this PDF"
            className="rt-pdf-cover"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              select();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select();
              }
            }}
          />
        ) : null}

        {/* When selected, interactive resize handles on 4 sides: upper middle (n), lower middle (s), left middle (w), right middle (e) */}
        {editable && selected && valid ? (
          <>
            {(["n", "s", "w", "e"] as Handle[]).map((h) => (
              <span
                key={h}
                role="presentation"
                className={`rt-handle rt-h-${h}`}
                onPointerDown={(e) => startHandleResize(e, h)}
              />
            ))}
            {dragging ? (
              <span className="rt-size-badge">
                {dragging === "width" ? `${width ?? 100}%` : `${height}px`}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {editable && selected ? (
        <div
          className="rt-toolbar flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => {
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
                setMarginOverride(null);
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

          {name ? (
            <span className="max-w-48 truncate font-mono text-micro text-text-tertiary" title={name}>
              {name}
            </span>
          ) : null}

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="ml-auto border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsPdf = Node.create({
  name: "brsPdf",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      /* The data URL. parseHTML re-validates on the way in, so a
         document hand-edited to carry a data:text/html here loses it at
         parse time rather than reaching the iframe. */
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute("data-src");
          return isPdfDataUrl(v) ? v : null;
        },
        renderHTML: (a: Record<string, unknown>) =>
          isPdfDataUrl(a.src) ? { "data-src": a.src } : {},
      },
      name: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-name"),
        renderHTML: (a: Record<string, unknown>) => (a.name ? { "data-name": String(a.name) } : {}),
      },
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? "center",
        renderHTML: (a: Record<string, unknown>) => ({ "data-align": String(a.align ?? "center") }),
      },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => imageWidth(el.getAttribute("data-width")),
        renderHTML: (a: Record<string, unknown>) => {
          const w = imageWidth(a.width);
          return w ? { "data-width": String(w) } : {};
        },
      },
      height: {
        default: RICH_PDF_HEIGHT_DEFAULT,
        parseHTML: (el: HTMLElement) => pdfHeight(el.getAttribute("data-height")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-height": String(pdfHeight(a.height)) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-rt-pdf]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-rt-pdf": "", class: "rt-figure rt-pdf" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfView);
  },
});


/* ══ PAGE FURNITURE ═══════════════════════════════════════════════════
 *
 * A button, a row of columns, and a card to put in one.
 *
 * These exist because an event ANNOUNCEMENT is not a write-up. The
 * archive's older entries are accounts of things that already happened —
 * paragraphs and photographs, which is what everything above this line
 * serves. A page for something that has NOT happened yet has a different
 * job: it has to say where to sign up, and it has to lay six segments
 * out as six boxes rather than as six paragraphs.
 *
 * The three of them compose rather than each being its own layout: a
 * fact strip is a row of plain cards, a segment grid is a row of
 * bordered cards with icons, a sponsor row is a row of cards holding
 * pictures. One node, three pages, instead of three nodes that each do
 * one page.
 */

/** A chip in one of the strips below. Mousedown rather than click for
 *  the reason the toolbar's own buttons give: clicking blurs the editor
 *  and collapses the selection before the command can act on it. */
function Chip({
  active,
  title,
  onPress,
  children,
}: {
  active?: boolean;
  title: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`border px-2 py-1 text-micro uppercase transition-colors ${
        active
          ? "border-accent text-text-primary"
          : "border-line-hairline text-text-secondary hover:border-accent hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/** The strip itself. `contentEditable={false}` is what stops the caret
 *  landing between two controls — a cursor inside a toolbar is a cursor
 *  ProseMirror will try to map back into the document and fail. */
function Tools({
  children,
  handle,
  /** "span" for a strip belonging to an INLINE node. A <div> inside the
   *  <p> ProseMirror drew is invalid nesting, and React says so on every
   *  render; the strip is a flex box either way, so the tag costs
   *  nothing to get right. */
  as: As = "div",
}: {
  children: React.ReactNode;
  handle?: boolean;
  as?: "div" | "span";
}) {
  return (
    <As
      className="rt-tools flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
      contentEditable={false}
      {...(handle ? { "data-drag-handle": "" } : {})}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {children}
    </As>
  );
}

/** A `<select>` sized for a strip. Native, deliberately: a custom
 *  dropdown inside a contenteditable has to manage its own focus and
 *  its own escape key, and the toolbar above already proved the native
 *  one is fine. */
function Picker({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      title={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="adm-input w-auto py-1 text-body-s"
    >
      {children}
    </select>
  );
}

/* ══ BrsButton ════════════════════════════════════════════════════════
 *
 * THE THING THAT IS NOT A LINK.
 *
 * Its label and address are edited in a dialog rather than typed into
 * the page, which is the opposite of the choice the card below makes,
 * and the difference is worth stating: a button holds four words and an
 * address, and a caret inside a 44px-tall coloured rectangle in the
 * middle of a contenteditable is a caret in a place with no line to sit
 * on. A card holds a heading and a sentence and wants the whole toolbar.
 *
 * So this is an ATOM — the editor draws it, and double-clicking it (or
 * the pencil in its strip) opens the same dialog the toolbar opens.
 */

/** Fired at the editor's own DOM node, caught by RichText, which owns
 *  the dialogs. A custom event rather than a prop threaded through
 *  ReactNodeViewRenderer: node views are constructed by ProseMirror
 *  rather than by React, so there is no parent to pass a callback down
 *  from without putting mutable state on the extension. */
export const RT_EDIT_BUTTON_EVENT = "brs-rt-edit-button";

/* ── MOVING A BUTTON ──────────────────────────────────────────────────
 *
 * A button is an INLINE ATOM — a word made of metal. That one fact
 * settles most of what a writer asks of it. It is inserted where the
 * caret is, because that is where a word goes. Text flows past it on
 * both sides, so the space beside one is not a gap in a layout, it is
 * the paragraph — which is why clicking there starts typing there. A
 * line holds as many as fit, for the same reason a line holds as many
 * words as fit.
 *
 * So "drop it anywhere" means anywhere a WORD can go, and the gesture
 * answers with the only thing a word-sized target can honestly promise:
 * a caret showing which side of which word it will land on.
 *
 * The alternative — absolute coordinates, a button parked over the
 * text — was not built, and the reason is the one the layout area in
 * this same file already learned: a position measured in pixels against
 * a column whose width changes with the screen is a position that is
 * right on the machine it was set on and wrong everywhere else. The
 * grid exists for writers who want to place things; a button in a
 * paragraph belongs to the paragraph.
 *
 * ── WHY POINTER EVENTS AND NOT HTML5 DRAG ──
 * `draggable` + dragstart is what ProseMirror uses natively, and on
 * Android it does not fire at all. Writing `touchstart` beside it would
 * mean maintaining the same gesture twice and having it drift. Pointer
 * events cover a mouse, a finger and a stylus in one handler, and
 * pointer CAPTURE keeps the gesture reporting after the pointer leaves
 * the target — which, on a phone, happens in the first few pixels.
 *
 * ── WHY THE DRAG DOES NOT BEGIN ON PRESS ──
 * The same press has three other jobs: select the button, open the
 * dialog on a double-click, and — on a phone — do nothing whatsoever if
 * the finger was actually trying to scroll the page. Nothing is
 * committed and no default is prevented until the pointer has travelled
 * far enough that it cannot have been any of those.
 */

/** Far enough that a shaky press is not read as a drag, near enough
 *  that a deliberate one starts without a wait. A finger is shakier
 *  than a mouse and gets more room. */
const dragSlop = (pointerType: string) => (pointerType === "mouse" ? 4 : 9);

/** How close to the edge of the scrolling area the pointer must come
 *  before the page starts following it, and how fast it then goes. */
const EDGE_BAND = 64;
const EDGE_SPEED = 14;

/** The nearest ancestor that actually scrolls; null means the window
 *  does. Found by asking rather than assumed, because the editor sits
 *  inside an admin shell whose scroll container has moved twice. */
function scrollBoxOf(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const flow = getComputedStyle(p).overflowY;
    if ((flow === "auto" || flow === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null;
}

/**
 * Where a release at this point would put the button, as a document
 * position — or null when the answer is "nowhere it is allowed to go".
 *
 * Three things can go wrong with a raw `posAtCoords`, and all three
 * happen constantly during a real drag: the point lands in the gap
 * between two blocks, or on a picture, or inside the button being
 * dragged. Selection.near answers the first two by walking to the
 * closest place a caret can sit; the schema check answers "may an
 * inline node go here at all", which is not the same question and is
 * false inside a table cell's header row or an empty layout box.
 */
function dropAt(
  view: EditorView,
  x: number,
  y: number,
  type: NodeType,
  from: number,
  to: number,
): number | null {
  const found = view.posAtCoords({ left: x, top: y });
  if (!found) return null;

  const at = Selection.near(view.state.doc.resolve(found.pos), 1).from;
  // Inside the node being dragged is not a move, it is a no-op that
  // would delete and reinsert at a position the delete just removed.
  if (at > from && at < to) return null;

  const $at = view.state.doc.resolve(at);
  if (!$at.parent.inlineContent) return null;
  if (!$at.parent.canReplaceWith($at.index(), $at.index(), type)) return null;
  return at;
}

type DragHandoff = {
  event: React.PointerEvent<HTMLElement>;
  editor: NodeViewProps["editor"];
  getPos: NodeViewProps["getPos"];
  node: NodeViewProps["node"];
  label: string;
  onLive: (live: boolean) => void;
};

function startButtonDrag({ event, editor, getPos, node, label, onLive }: DragHandoff) {
  const view = editor.view;
  const grip = event.currentTarget;
  const pointerId = event.pointerId;
  const slop = dragSlop(event.pointerType);
  const startX = event.clientX;
  const startY = event.clientY;

  const from = getPos();
  if (typeof from !== "number") return;
  const to = from + node.nodeSize;

  const scroller = scrollBoxOf(view.dom);

  let live = false;
  let target: number | null = null;
  let ghost: HTMLElement | null = null;
  let caret: HTMLElement | null = null;
  let edge = 0;
  let frame = 0;
  let lastX = startX;
  let lastY = startY;

  /* THE FEEDBACK IS MOST OF THE GESTURE. A label under the pointer says
     WHAT is moving, which matters on a phone because the finger is
     covering the original. A caret in the text says WHERE it lands, and
     it is deliberately the same caret the writer already reads to know
     where the next character will go. */
  const arm = () => {
    live = true;
    onLive(true);
    document.body.classList.add("rt-btn-dragging");

    ghost = document.createElement("div");
    ghost.className = "rt-drag-ghost";
    ghost.textContent = label || "Button";
    document.body.appendChild(ghost);

    caret = document.createElement("div");
    caret.className = "rt-drop-caret";
    document.body.appendChild(caret);

    try {
      grip.setPointerCapture(pointerId);
    } catch {
      /* A browser may refuse capture on an element it has already let
         go of. The window listeners carry the gesture either way, so
         this is a downgrade rather than a failure. */
    }
    frame = requestAnimationFrame(tick);
  };

  const paint = () => {
    if (ghost) {
      ghost.style.left = `${Math.round(lastX)}px`;
      ghost.style.top = `${Math.round(lastY)}px`;
    }
    if (!caret) return;
    if (target === null) {
      caret.classList.remove("is-on");
      return;
    }
    const at = view.coordsAtPos(target);
    caret.style.left = `${Math.round(at.left)}px`;
    caret.style.top = `${Math.round(at.top)}px`;
    caret.style.height = `${Math.max(16, Math.round(at.bottom - at.top))}px`;
    caret.classList.add("is-on");
  };

  const aim = () => {
    target = dropAt(view, lastX, lastY, node.type, from, to);
    paint();
  };

  /* Dragging to a paragraph that is off the bottom of a phone screen is
     the ordinary case, not the exotic one — there is no second hand to
     scroll with. Holding near the edge scrolls, and the drop position
     is recomputed as the text moves under a stationary finger. */
  const tick = () => {
    if (!live) return;
    if (edge !== 0) {
      if (scroller) scroller.scrollTop += edge * EDGE_SPEED;
      else window.scrollBy(0, edge * EDGE_SPEED);
      aim();
    }
    frame = requestAnimationFrame(tick);
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    lastX = ev.clientX;
    lastY = ev.clientY;

    if (!live) {
      if (Math.abs(lastX - startX) < slop && Math.abs(lastY - startY) < slop) return;
      arm();
    }

    /* Only once the drag is real. preventDefault here is what stops a
       finger from scrolling the page and a mouse from painting a text
       selection across the document — and doing it here rather than on
       the press is what leaves an ordinary click and an ordinary
       double-click completely alone. */
    ev.preventDefault();

    const bounds = scroller
      ? scroller.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    edge = lastY < bounds.top + EDGE_BAND ? -1 : lastY > bounds.bottom - EDGE_BAND ? 1 : 0;

    aim();
  };

  /**
   * ONE TRANSACTION, NOT TWO COMMANDS.
   *
   * Delete-then-insert as a chain of two is how this was wrong before:
   * the second command's position was measured against the document the
   * first one had already shortened, so every drop below the button
   * landed `nodeSize` characters past where the writer pointed. Inside
   * one transaction the mapping is the transaction's own, and the
   * position follows the edit that moved it.
   */
  const commit = () => {
    if (target === null) return;
    const at = getPos();
    if (typeof at !== "number") return;
    const end = at + node.nodeSize;
    if (target >= at && target <= end) return;

    const tr = view.state.tr;
    tr.delete(at, end);
    const landed = tr.mapping.map(target, -1);
    tr.insert(landed, node.type.create(node.attrs, null, node.marks));
    tr.setSelection(NodeSelection.create(tr.doc, landed));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  };

  const finish = (keep: boolean) => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    ghost?.remove();
    caret?.remove();
    document.body.classList.remove("rt-btn-dragging");
    try {
      grip.releasePointerCapture(pointerId);
    } catch {
      /* Already released — see setPointerCapture above. */
    }
    if (!live) return;
    live = false;
    onLive(false);
    if (keep) commit();
  };

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    finish(true);
  };
  const onCancel = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    finish(false);
  };

  // `passive: false` is not decoration: without it the browser ignores
  // the preventDefault above and the page scrolls under the finger.
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
}


function ButtonView({ node, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const label = typeof node.attrs.label === "string" ? node.attrs.label : "";
  const href = typeof node.attrs.href === "string" ? node.attrs.href : "";
  const look = buttonAttrs(node.attrs);
  const editable = editor.isEditable;
  const [dragging, setDragging] = useState(false);

  const select = () => {
    const pos = getPos();
    if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
  };

  const edit = () => {
    select();
    editor.view.dom.dispatchEvent(new CustomEvent(RT_EDIT_BUTTON_EVENT, { bubbles: true }));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!editable) return;
    // Secondary buttons belong to the context menu. The click COUNT is
    // deliberately not consulted: guarding on it meant the press right
    // after a double-click was thrown away, so editing a button and
    // then moving it did nothing at all until you clicked elsewhere
    // first. A stationary double-click cannot arm a drag anyway — it
    // never travels past the slop below.
    if (e.button !== 0) return;
    select();
    startButtonDrag({ event: e, editor, getPos, node, label, onLive: setDragging });
  };

  /**
   * WHY THE PRESS IS TAKEN AWAY FROM PROSEMIRROR.
   *
   * Without this, clicking a button selected nothing: `setNodeSelection`
   * above ran, and then ProseMirror's own mousedown handler — listening
   * on the editor element this span sits inside — reached the same press
   * a moment later and replaced the node selection with a text cursor.
   * The strip never appeared, so there was no sign the button could be
   * picked up at all.
   *
   * stopPropagation, not preventDefault alone: the default is the
   * browser's (focus, and starting a text-selection drag), and it is the
   * one this also has to stop. But the SELECTION is ProseMirror's, and
   * the only way to keep it is for the press not to reach it. Both are
   * needed and they stop different things.
   *
   * Click counting is unaffected — dblclick is dispatched from the same
   * element and still opens the dialog.
   */
  const onMouseDown = (e: React.MouseEvent) => {
    if (!editable || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <NodeViewWrapper
      as="span"
      className={`rt-btn-wrap${selected ? " rt-node-selected" : ""}${dragging ? " is-dragging" : ""}`}
    >
      <span
        /* Class AND style from the same builder the renderer uses, so
           the draft is the published button rather than a likeness of
           it. `rt-btn-grab` is the only thing added here, because it is
           the only thing that is true of the draft and not the page. */
        className={`${look.class}${editable ? " rt-btn-grab" : ""}`}
        style={buttonVars(node.attrs) as React.CSSProperties}
        contentEditable={false}
        draggable={false}
        title={
          editable
            ? `${href || "No link yet"} — drag to move it, double-click to edit`
            : undefined
        }
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        onDoubleClick={editable ? edit : undefined}
      >
        {label || "Button"}
      </span>

      {/* ABSOLUTELY POSITIONED, and that is the whole point: a strip in
          the flow would be a block sitting in the middle of a line of
          text, which is exactly the thing that stopped words from
          running past the button in the first place. Out of flow, the
          line is a line and the controls hang below it.

          TWO CONTROLS, NOT SEVENTEEN. It used to carry every variant,
          every size and three alignments as chips — a control panel
          hanging under a word, wider than the button by a factor of
          six, covering the paragraph beneath it. Every one of those
          settings now lives in the dialog, where they can be seen
          together against a preview instead of guessed at one chip at a
          time. What is left is the two things you cannot do in a
          dialog: open it, and get rid of the button. */}
      {editable && selected && !dragging ? (
        <span className="rt-btn-tools">
          <Tools as="span">
            <Chip title="Change the words, the link or the look" onPress={edit}>
              Edit
            </Chip>
            <Chip title="Remove this button" onPress={deleteNode}>
              Remove
            </Chip>
          </Tools>
        </span>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsButton = Node.create({
  name: "brsButton",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-label") ?? el.textContent,
        renderHTML: (a: Record<string, unknown>) =>
          a.label ? { "data-label": String(a.label) } : {},
      },
      href: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("href"),
        renderHTML: (a: Record<string, unknown>) => (a.href ? { href: String(a.href) } : {}),
      },
      variant: {
        default: RICH_BUTTON_VARIANT_DEFAULT,
        parseHTML: (el: HTMLElement) => buttonVariant(el.getAttribute("data-variant")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-variant": buttonVariant(a.variant) }),
      },
      size: {
        default: RICH_BUTTON_SIZE_DEFAULT,
        parseHTML: (el: HTMLElement) => buttonSize(el.getAttribute("data-size")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-size": buttonSize(a.size) }),
      },
      radius: {
        default: RICH_BUTTON_RADIUS_DEFAULT,
        parseHTML: (el: HTMLElement) => buttonRadius(el.getAttribute("data-radius")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-radius": buttonRadius(a.radius) }),
      },
      weight: {
        default: RICH_BUTTON_WEIGHT_DEFAULT,
        parseHTML: (el: HTMLElement) => buttonWeight(el.getAttribute("data-weight")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-weight": buttonWeight(a.weight) }),
      },
      /* The three switches. `false` writes nothing, for the reason the
         colours give: the common button has none of them set and should
         carry no attribute saying so. */
      italic: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute("data-italic"),
        renderHTML: (a: Record<string, unknown>) => (a.italic ? { "data-italic": "" } : {}),
      },
      underline: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute("data-underline"),
        renderHTML: (a: Record<string, unknown>) => (a.underline ? { "data-underline": "" } : {}),
      },
      caps: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute("data-caps"),
        renderHTML: (a: Record<string, unknown>) => (a.caps ? { "data-caps": "" } : {}),
      },
      /* The two exact colours. Null — the usual answer — writes nothing
         at all, so a button that takes its style's colours stores no
         colour, and the generated content file does not grow an
         attribute on every button the day this shipped. */
      bg: {
        default: null,
        parseHTML: (el: HTMLElement) => buttonColour(el.getAttribute("data-bg")),
        renderHTML: (a: Record<string, unknown>) => {
          const c = buttonColour(a.bg);
          return c ? { "data-bg": c } : {};
        },
      },
      fg: {
        default: null,
        parseHTML: (el: HTMLElement) => buttonColour(el.getAttribute("data-fg")),
        renderHTML: (a: Record<string, unknown>) => {
          const c = buttonColour(a.fg);
          return c ? { "data-fg": c } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-rt-button]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { "data-rt-button": "" }, buttonAttrs(node.attrs)),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },
});

/* ══ BrsCard ══════════════════════════════════════════════════════════
 *
 * ONE CELL, HOLDING REAL BLOCKS.
 *
 * `content: "block+"` and NOT a title/body pair of string attributes —
 * the argument is written out in palette.ts under RICH_CARD_VARIANTS,
 * and the short version is that the toolbar already knows how to format
 * a heading and richDocToText() already knows how to read one.
 *
 * NO `group`, deliberately. The document's own content expression is
 * `block+`, so a node that is not in that group cannot be typed into the
 * top level of a write-up — a card exists only inside a row, and the
 * schema is what says so rather than a check somewhere in the toolbar.
 *
 * `isolating` is what makes Backspace at the top of a card stop there
 * instead of pulling the card into the one before it, which is the same
 * reason a table cell sets it.
 */
function CardView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const variant = cardVariant(node.attrs.variant);
  const align = cardAlign(node.attrs.align);
  const icon = typeof node.attrs.icon === "string" ? node.attrs.icon : "";
  const svg = richIconSvg(icon);
  const href = typeof node.attrs.href === "string" ? node.attrs.href : "";
  const editable = editor.isEditable;

  /* The link box is local until it is committed, so every keystroke is
     not a document transaction — and so an address that will not
     publish can be visibly rejected rather than silently stored. */
  const [link, setLink] = useState(href);
  useEffect(() => setLink(href), [href]);

  const commitLink = () => {
    const v = link.trim();
    if (!v) {
      updateAttributes({ href: null });
      return;
    }
    // The same three shapes render.ts's safeHref keeps. Anything else
    // snaps back to what is stored, so the field shows the truth.
    if (/^(https?:\/\/|mailto:|\/)/i.test(v)) updateAttributes({ href: v });
    else setLink(href);
  };

  const remove = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const $pos = editor.state.doc.resolve(pos);
    /* THE LAST CARD TAKES THE ROW WITH IT. A brsColumns whose content
       expression is `brsCard+` cannot hold zero cards, and leaving
       ProseMirror to repair that produces an empty row that renders as
       nothing and therefore cannot be clicked in order to be deleted. */
    if ($pos.parent.type.name === "brsColumns" && $pos.parent.childCount <= 1) {
      editor.chain().focus().deleteRange({ from: $pos.before(), to: $pos.after() }).run();
      return;
    }
    editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
  };

  return (
    <NodeViewWrapper className={`rt-card rt-card-${variant} rt-card-${align} rt-card-shell`}>
      {svg ? (
        <span
          className="rt-card-icon"
          contentEditable={false}
          /* Every byte of this came out of the table in palette.ts, which
             is a literal in that file — see the note on richIconSvg. No
             author input reaches it, as a path or as anything else. */
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}

      <NodeViewContent className="rt-card-body" />

      {editable ? (
        <Tools>
          <Picker label="Icon" value={icon} onChange={(v) => updateAttributes({ icon: v || null })}>
            <option value="">No icon</option>
            {RICH_ICONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Picker>

          <Picker label="Card style" value={variant} onChange={(v) => updateAttributes({ variant: v })}>
            {RICH_CARD_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Picker>

          {RICH_CARD_ALIGNS.map((a) => (
            <Chip
              key={a}
              title={`Align ${a}`}
              active={align === a}
              onPress={() => updateAttributes({ align: a })}
            >
              {a}
            </Chip>
          ))}

          <input
            type="text"
            aria-label="Link the whole card"
            title="Where the whole card goes. https:// , mailto: or / for a page on this site."
            placeholder="Link the card (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onBlur={commitLink}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitLink();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="adm-input w-44 py-1 text-body-s"
          />

          <Chip title="Remove this card" onPress={remove}>
            Remove
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsCard = Node.create({
  name: "brsCard",
  content: "block+",
  isolating: true,
  defining: true,
  selectable: false,

  addAttributes() {
    return {
      icon: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-icon"),
        renderHTML: (a: Record<string, unknown>) => (a.icon ? { "data-icon": String(a.icon) } : {}),
      },
      variant: {
        default: RICH_CARD_VARIANT_DEFAULT,
        parseHTML: (el: HTMLElement) => cardVariant(el.getAttribute("data-variant")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-variant": cardVariant(a.variant) }),
      },
      align: {
        default: RICH_CARD_ALIGN_DEFAULT,
        parseHTML: (el: HTMLElement) => cardAlign(el.getAttribute("data-align")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-align": cardAlign(a.align) }),
      },
      href: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-href"),
        renderHTML: (a: Record<string, unknown>) => (a.href ? { "data-href": String(a.href) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-card]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-card": "", class: "rt-card" }), 0];
  },

  /* Same mount as a cell has, for a smaller reason: `min-width: 0` has
     to sit on the GRID ITEM to stop one long word setting the column's
     minimum and pushing the whole row wider than the page. On the
     published card it already does; in the editor the item is the
     mount, so the mount needs it too. */
  addNodeView() {
    return ReactNodeViewRenderer(CardView, { className: "rt-card-mount" });
  },
});

/* ══ BrsColumns ═══════════════════════════════════════════════════════
 *
 * THE ROW. Two, three or four equal cards — see RICH_COLUMN_COUNTS for
 * why the count is closed and why nothing per-breakpoint is stored.
 */

/** What a new cell starts as: a place for a title and a place for a
 *  sentence, both empty. NOT filled with "Title" and "Description",
 *  because placeholder prose that nobody edits is placeholder prose
 *  that publishes. */
const emptyCard = () => ({
  type: "brsCard",
  content: [{ type: "heading", attrs: { level: 3 } }, { type: "paragraph" }],
});

/** A whole row, as the toolbar inserts it. */
export const emptyColumns = (cols: number) => ({
  type: "brsColumns",
  attrs: { cols },
  content: Array.from({ length: cols }, emptyCard),
});

function ColumnsView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const cols = columnCount(node.attrs.cols);
  const editable = editor.isEditable;

  const addCard = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    /* One before the row's own closing token, which is where "after the
       last card" is. Appending at `pos + nodeSize` would put the card
       after the ROW, where the schema does not allow one at all. */
    editor
      .chain()
      .focus()
      .insertContentAt(pos + node.nodeSize - 1, emptyCard())
      .run();
  };

  return (
    <NodeViewWrapper className="rt-shell rt-cols-shell">
      <NodeViewContent className={`rt-cols rt-cols-${cols}`} />

      {editable ? (
        <Tools handle>
          <span className="text-micro uppercase text-text-tertiary">Columns</span>
          {RICH_COLUMN_COUNTS.map((n) => (
            <Chip
              key={n}
              title={`${n} across`}
              active={cols === n}
              onPress={() => updateAttributes({ cols: n })}
            >
              {n}
            </Chip>
          ))}

          <span aria-hidden="true" className="h-5 w-px bg-line-hairline" />

          {/* The count and the card count are SEPARATE on purpose: six
              segments in a three-across row is two rows of three, which
              is exactly the layout the client's page has. Forcing them
              equal would make that impossible to express. */}
          <Chip title="Add another card to this row" onPress={addCard}>
            + Card
          </Chip>
          <Chip title="Remove the whole row" onPress={deleteNode}>
            Remove row
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsColumns = Node.create({
  name: "brsColumns",
  group: "block",
  content: "brsCard+",
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      cols: {
        default: RICH_COLUMN_COUNT_DEFAULT,
        parseHTML: (el: HTMLElement) => columnCount(el.getAttribute("data-cols")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-cols": String(columnCount(a.cols)) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-cols]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-cols": "", class: "rt-cols" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView);
  },
});

/* ══ BrsCallout ═══════════════════════════════════════════════════════
 *
 * THE SENTENCE A READER MUST NOT MISS.
 *
 * Content, not attributes, for the third time in this file and for the
 * same reason each time: a deadline notice wants a bold date and a link
 * to the form, and the toolbar already knows how to make both.
 */
function CalloutView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const tone = calloutTone(node.attrs.tone);
  const icon = typeof node.attrs.icon === "string" ? node.attrs.icon : "";
  const svg = richIconSvg(icon);

  return (
    <NodeViewWrapper className={`rt-callout rt-callout-${tone} rt-callout-shell`}>
      {svg ? (
        <span
          className="rt-callout-icon"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}

      <NodeViewContent className="rt-callout-body" />

      {editor.isEditable ? (
        <Tools>
          <Picker label="Tone" value={tone} onChange={(v) => updateAttributes({ tone: v })}>
            {RICH_CALLOUT_TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Picker>
          <Picker label="Icon" value={icon} onChange={(v) => updateAttributes({ icon: v || null })}>
            <option value="">No icon</option>
            {RICH_ICONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Picker>
          <Chip title="Remove this callout" onPress={deleteNode}>
            Remove
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsCallout = Node.create({
  name: "brsCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: RICH_CALLOUT_TONE_DEFAULT,
        parseHTML: (el: HTMLElement) => calloutTone(el.getAttribute("data-tone")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-tone": calloutTone(a.tone) }),
      },
      icon: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-icon"),
        renderHTML: (a: Record<string, unknown>) => (a.icon ? { "data-icon": String(a.icon) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-callout": "", class: "rt-callout" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

/* ══ BrsSpacer ════════════════════════════════════════════════════════
 *
 * A BLOCK WHOSE JOB IS TO BE NOTHING.
 *
 * Four presses of Enter store four empty paragraphs, and four empty
 * paragraphs are four things that the next change to the document's
 * leading quietly resizes. This is one node that says 48px, on purpose,
 * and still says it next year — see RICH_SPACER_SIZES.
 */
function SpacerView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const size = spacerSize(node.attrs.size);

  return (
    <NodeViewWrapper
      className={`rt-shell rt-spacer-shell${selected ? " rt-node-selected" : ""}`}
      data-drag-handle
    >
      {/* Invisible on the page; here it needs an edge, or a writer
          cannot see the thing they are about to resize. */}
      <div className={`rt-spacer rt-spacer-${size}`} contentEditable={false}>
        <span className="rt-spacer-mark" aria-hidden="true" />
      </div>

      {editor.isEditable && selected ? (
        <Tools>
          {RICH_SPACER_SIZES.map((z) => (
            <Chip
              key={z.id}
              title={z.label}
              active={size === z.id}
              onPress={() => updateAttributes({ size: z.id })}
            >
              {z.id}
            </Chip>
          ))}
          <Chip title="Remove this space" onPress={deleteNode}>
            Remove
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsSpacer = Node.create({
  name: "brsSpacer",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      size: {
        default: RICH_SPACER_SIZE_DEFAULT,
        parseHTML: (el: HTMLElement) => spacerSize(el.getAttribute("data-size")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-size": spacerSize(a.size) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-spacer]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-spacer": "", class: "rt-spacer" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpacerView);
  },
});

/* ══ BrsDetails / BrsSummary ══════════════════════════════════════════
 *
 * AN ACCORDION, AND IT IS THE BROWSER'S OWN.
 *
 * The renderer emits <details>/<summary>, which opens with no
 * JavaScript, is already in the tab order, already announces its open
 * state to a screen reader, and is already opened by Ctrl+F when the
 * text a reader is searching for is inside it. A <div> with a click
 * handler would have been none of those four things, and a rulebook
 * that Ctrl+F cannot find is a rulebook nobody can use.
 *
 * TWO NODES, NOT A `summary` STRING ATTRIBUTE. Same argument as the
 * card: the summary is a line of writing, it wants the toolbar, and
 * richDocToText() has to be able to see it or "Rules for the line
 * follower" is invisible to the page's own description.
 */
export const BrsSummary = Node.create({
  name: "brsSummary",
  content: "inline*",
  defining: true,
  selectable: false,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes, { class: "rt-summary" }), 0];
  },
});

function DetailsView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const open = node.attrs.open === true;

  return (
    <NodeViewWrapper className="rt-details rt-details-shell">
      {/* ALWAYS EXPANDED IN THE EDITOR, whatever `open` says.
          A closed accordion in a writing surface is content that cannot
          be edited without first being opened, and a writer who cannot
          see a paragraph cannot fix it. `open` is what the READER gets;
          the chip below sets it. */}
      <NodeViewContent className="rt-details-inner" />

      {editor.isEditable ? (
        <Tools>
          <Chip
            title="Whether it starts open for a reader"
            active={open}
            onPress={() => updateAttributes({ open: !open })}
          >
            {open ? "Starts open" : "Starts closed"}
          </Chip>
          <Chip title="Remove this section" onPress={deleteNode}>
            Remove
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsDetails = Node.create({
  name: "brsDetails",
  group: "block",
  /* The summary is REQUIRED and comes first. Expressing it in the schema
     rather than checking for it means a document without one cannot
     exist — including one that has been edited by hand. */
  content: "brsSummary block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute("open"),
        renderHTML: (a: Record<string, unknown>) => (a.open ? { open: "" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes, { class: "rt-details" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DetailsView);
  },
});

/** What the toolbar and the slash menu insert. */
export const emptyDetails = () => ({
  type: "brsDetails",
  content: [{ type: "brsSummary" }, { type: "paragraph" }],
});

/* ══ BrsSection ═══════════════════════════════════════════════════════
 *
 * THE BAND — the one block that leaves the article's measure.
 *
 * See RICH_SECTION_TONES in palette.ts for the mechanics and for why a
 * background photograph is stored as an ASSET ID and rendered as an
 * <img> rather than as a CSS url().
 */

/** Fired when the band's strip asks for a background. Carries the band's
 *  own position, so the dialog can set the attribute on THAT node rather
 *  than on whatever the selection happens to be when it closes. */
export const RT_PICK_BAND_EVENT = "brs-rt-pick-band";

function SectionView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const tone = sectionTone(node.attrs.tone);
  const scrim = sectionScrim(node.attrs.scrim);
  const assetId = typeof node.attrs.assetId === "string" ? node.attrs.assetId : "";
  const [asset, setAsset] = useState<AssetRow | null>(() => peekAsset(assetId));

  /* The same cache the inline pictures read, so a background that is
     already in hand paints without a second request. */
  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      return;
    }
    setAsset(peekAsset(assetId));
    void loadAsset(assetId).then(setAsset);
    return onAssetsChanged(() => setAsset(peekAsset(assetId)));
  }, [assetId]);

  const pickBackground = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.view.dom.dispatchEvent(
      new CustomEvent(RT_PICK_BAND_EVENT, { bubbles: true, detail: { pos } }),
    );
  };

  return (
    <NodeViewWrapper
      className={`rt-band rt-band-${tone}${asset ? " rt-band-photo" : ""} rt-band-shell`}
    >
      {asset ? (
        <div className="rt-band-bg" contentEditable={false} aria-hidden="true">
          <img src={assetUrl(asset)} alt="" />
        </div>
      ) : null}
      {asset && scrim !== "none" ? (
        <div className={`rt-band-scrim rt-band-scrim-${scrim}`} contentEditable={false} aria-hidden="true" />
      ) : null}

      <NodeViewContent className="rt-band-inner" />

      {editor.isEditable ? (
        <Tools handle>
          <Picker label="Band colour" value={tone} onChange={(v) => updateAttributes({ tone: v })}>
            {RICH_SECTION_TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Picker>

          {/* The scrim only means anything over a photograph. Offering
              it on a plain colour band is a control that does nothing,
              which is worse than a control that is missing. */}
          {asset ? (
            <Picker label="Scrim" value={scrim} onChange={(v) => updateAttributes({ scrim: v })}>
              {RICH_SECTION_SCRIMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Picker>
          ) : null}

          <Chip title="Choose a background photograph" onPress={pickBackground}>
            {asset ? "Change photo" : "Background…"}
          </Chip>
          {asset ? (
            <Chip title="Remove the background photograph" onPress={() => updateAttributes({ assetId: null })}>
              Clear photo
            </Chip>
          ) : null}

          <Chip title="Remove this band" onPress={deleteNode}>
            Remove band
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsSection = Node.create({
  name: "brsSection",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      tone: {
        default: RICH_SECTION_TONE_DEFAULT,
        parseHTML: (el: HTMLElement) => sectionTone(el.getAttribute("data-tone")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-tone": sectionTone(a.tone) }),
      },
      scrim: {
        default: RICH_SECTION_SCRIM_DEFAULT,
        parseHTML: (el: HTMLElement) => sectionScrim(el.getAttribute("data-scrim")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-scrim": sectionScrim(a.scrim) }),
      },
      assetId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-asset-id"),
        renderHTML: (a: Record<string, unknown>) =>
          a.assetId ? { "data-asset-id": String(a.assetId) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-rt-band]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-rt-band": "", class: "rt-band" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionView);
  },
});

/** A band starts as a heading and a line, both empty. */
export const emptySection = () => ({
  type: "brsSection",
  content: [{ type: "heading", attrs: { level: 2, textAlign: "center" } }, { type: "paragraph", attrs: { textAlign: "center" } }],
});

/* ══ TABLES ═══════════════════════════════════════════════════════════
 *
 * PROSEMIRROR-TABLES, WHICH IS ALREADY INSTALLED.
 *
 * @tiptap/pm bundles it, so the editing behaviour that makes a table
 * usable — Tab between cells, drag a rectangular selection, merge,
 * split, add and delete rows and columns, and the repair pass that
 * keeps a table rectangular after every one of those — costs nothing to
 * adopt and would have been several hundred lines to reimplement badly.
 *
 * WHAT IS OURS IS THE SCHEMA AND THE OUTPUT. The node NAMES are the
 * library's, because its commands look their own node types up by name
 * and renaming them would mean forking it.
 *
 * ── HOW `tableRole` REACHES THE SCHEMA ──
 * prosemirror-tables finds its node types through `spec.tableRole`, and
 * Tiptap does not copy unknown config keys into the spec. The official
 * extension solves this with declaration merging on Tiptap's own config
 * interface — a `declare module` block against a package this app does
 * not depend on directly. So the role is carried in `addOptions`, which
 * IS typed, and `extendNodeSchema` below lifts it onto the spec. Same
 * result, no module augmentation.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──
 * COLUMN RESIZING. It stores a pixel width per cell, and a pixel width
 * is the same mistake an inline picture width was: 300px is a third of
 * the measure on a laptop and wider than a phone. Equal columns that
 * wrap is the honest behaviour until somebody asks otherwise.
 */

/** Lifts `options.tableRole` onto the node's schema spec. Declared once,
 *  on the table itself, and applied to every node in the editor —
 *  returning nothing for the ones that have no role. */
const liftTableRole = (extension: { options?: unknown }): Record<string, unknown> => {
  const role = (extension.options as { tableRole?: unknown } | undefined)?.tableRole;
  return typeof role === "string" ? { tableRole: role } : {};
};

/** The three attributes prosemirror-tables reads off a cell. `colwidth`
 *  is declared because the library's own repair code expects the key to
 *  exist; nothing sets it, because column resizing is not enabled. */
const cellAttributes = () => ({
  colspan: {
    default: 1,
    parseHTML: (el: HTMLElement) => Number(el.getAttribute("colspan")) || 1,
    renderHTML: (a: Record<string, unknown>) =>
      Number(a.colspan) > 1 ? { colspan: String(a.colspan) } : {},
  },
  rowspan: {
    default: 1,
    parseHTML: (el: HTMLElement) => Number(el.getAttribute("rowspan")) || 1,
    renderHTML: (a: Record<string, unknown>) =>
      Number(a.rowspan) > 1 ? { rowspan: String(a.rowspan) } : {},
  },
  colwidth: { default: null, renderHTML: () => ({}) },
});

export const BrsTable = Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,

  addOptions() {
    return { tableRole: "table" };
  },

  extendNodeSchema: liftTableRole,

  parseHTML() {
    return [{ tag: "table" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, { class: "rt-table" }),
      ["tbody", 0],
    ];
  },

  addProseMirrorPlugins() {
    /* The plugin that makes a table behave like a table rather than like
       a grid of unrelated boxes: rectangular cell selection, and the
       repair that keeps every row the same length after a merge. */
    return [tableEditing()];
  },

  addKeyboardShortcuts() {
    /* Tab is the only way anybody moves through a table, and without
       this it inserts a tab character into a cell. `false` lets the key
       fall through when the cursor is not in a table at all. */
    return {
      Tab: () => this.editor.chain().command(({ state, dispatch }) => goToNextCell(1)(state, dispatch)).run(),
      "Shift-Tab": () =>
        this.editor.chain().command(({ state, dispatch }) => goToNextCell(-1)(state, dispatch)).run(),
    };
  },
});

export const BrsTableRow = Node.create({
  name: "tableRow",
  content: "(tableCell | tableHeader)*",

  addOptions() {
    return { tableRole: "row" };
  },

  parseHTML() {
    return [{ tag: "tr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["tr", mergeAttributes(HTMLAttributes), 0];
  },
});

export const BrsTableCell = Node.create({
  name: "tableCell",
  content: "block+",
  isolating: true,

  addOptions() {
    return { tableRole: "cell" };
  },

  addAttributes: cellAttributes,

  parseHTML() {
    return [{ tag: "td" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes), 0];
  },
});

export const BrsTableHeader = Node.create({
  name: "tableHeader",
  content: "block+",
  isolating: true,

  addOptions() {
    return { tableRole: "header_cell" };
  },

  addAttributes: cellAttributes,

  parseHTML() {
    return [{ tag: "th" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes, { scope: "col" }), 0];
  },
});

/** A fresh table: a header row and two empty rows, three columns. The
 *  shape a prize table or a schedule starts as. */
export const emptyTable = (rows = 3, cols = 3) => {
  const cell = (type: string) => ({ type, content: [{ type: "paragraph" }] });
  const row = (type: string) => ({
    type: "tableRow",
    content: Array.from({ length: cols }, () => cell(type)),
  });
  return {
    type: "table",
    content: [row("tableHeader"), ...Array.from({ length: Math.max(1, rows - 1) }, () => row("tableCell"))],
  };
};

/** The table commands the toolbar offers, wrapped so a caller does not
 *  have to know they are raw ProseMirror commands. */
export const TABLE_ACTIONS = {
  addRow: addRowAfter,
  deleteRow,
  addColumn: addColumnAfter,
  deleteColumn,
  toggleHeaderRow,
  mergeCells,
  splitCell,
  deleteTable,
} as const;

/* ══ THE LAYOUT AREA ══════════════════════════════════════════════════
 *
 * FREE PLACEMENT THAT CANNOT BREAK.
 *
 * Twenty-four columns, and a cell's ROW GROWS. When a paragraph wraps
 * onto an extra line on somebody's phone, the row gets taller and
 * everything below it is pushed down. An editor that stored an exact
 * point per element — which this one had, briefly — would instead have
 * let it cover whatever was underneath, on that machine only, with
 * nothing to warn the person who arranged it.
 *
 * Overlap stops being a bug you find after publishing and becomes a
 * state the layout cannot express. See the layout note in palette.ts.
 *
 * ── THREE RULES THIS VIEW ENFORCES ──
 *   1. A drop that lands on an occupied square SLIDES DOWN to the first
 *      clear row rather than being refused or shoving anything aside.
 *      It always does something, and it never moves what you did not
 *      touch.
 *   2. After every move the cells are re-sorted top-to-bottom,
 *      left-to-right. That is what makes the phone's stack, a screen
 *      reader's reading order, and what a sighted reader sees the same
 *      sequence instead of three.
 *   3. One gesture is one undo step. The whole re-sort included.
 *
 * ── WHY THE GRID HAS NO GAP ──
 * Because the drag arithmetic has to turn a pointer position into a
 * column, and a gap makes that a different sum at every column. The
 * space between cells is padding INSIDE them instead: identical to
 * look at, and it keeps the column width an honest `width / 24`.
 */

/** Where a cell sits, read off a node. */
const boxOf = (n: { attrs: Record<string, unknown> }): GridBox => ({
  x: gridX(n.attrs.x),
  y: gridY(n.attrs.y),
  w: gridWAt(n.attrs.x, n.attrs.w),
  h: gridH(n.attrs.h),
});

/**
 * WHERE THE ROWS ACTUALLY ARE.
 *
 * Not arithmetic on a row height. Rows GROW to fit their contents —
 * that is the entire point of the grid — so they are not all the same
 * height, and no division can say which row a pixel is in.
 *
 * `grid-template-rows` on the computed style is the browser's own
 * answer to "how tall did each row end up", as a list of pixel values.
 * Walking it is exact. Past the last row that exists the base height is
 * the right guess, because a row holding nothing has not grown.
 */
function rowMetrics(track: HTMLElement, baseRowPx: number) {
  const rows = getComputedStyle(track)
    .gridTemplateRows.split(" ")
    .map((v) => Number.parseFloat(v))
    .filter((v) => Number.isFinite(v));

  const base = baseRowPx > 0 ? baseRowPx : 40;
  const at = (i: number) => rows[i] ?? base;

  return {
    /** Distance from the top of the grid to the start of a row. */
    offset(row: number): number {
      let total = 0;
      for (let i = 0; i < row; i++) total += at(i);
      return total;
    },
    /** How tall a run of rows is. */
    height(row: number, span: number): number {
      let total = 0;
      for (let i = row; i < row + span; i++) total += at(i);
      return total;
    },
    /** Which row a distance from the top falls in. */
    indexAt(y: number): number {
      if (y <= 0) return 0;
      let acc = 0;
      for (let i = 0; i < RICH_GRID_ROWS_MAX; i++) {
        acc += at(i);
        if (y < acc) return i;
      }
      return RICH_GRID_ROWS_MAX - 1;
    },
  };
}

function CellView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const stored = boxOf(node);
  const align = cellAlign(node.attrs.align);
  const valign = cellVAlign(node.attrs.valign);
  const editable = editor.isEditable;
  const shell = useRef<HTMLDivElement>(null);

  /**
   * THE ELEMENT THAT IS ACTUALLY THE GRID.
   *
   * Not `.rt-grid-stage`, and finding that out cost a bug. Tiptap does
   * not let a React node view own its content element: it creates its
   * OWN div, marks it `data-node-view-content-react`, and appends it
   * inside whatever `NodeViewContent` rendered. ProseMirror's children
   * go in there.
   *
   * So the stage's only child is that div, the grid placed IT — one
   * column of twenty-four — and every cell was crammed inside, which is
   * why a paragraph wrapped a letter per line however wide its box
   * claimed to be.
   *
   * Rather than name that div here, this walks UP from the mount: the
   * element the grid places is this cell's own mount, so the grid is
   * its parent, whatever Tiptap decided to call it. One less private
   * detail of somebody else's library to be wrong about later.
   */
  const track = (): HTMLElement | null => {
    const mount = shell.current?.closest(".rt-cell-mount");
    const parent = mount?.parentElement;
    return parent instanceof HTMLElement ? parent : null;
  };

  /** The grid this cell is in, its siblings' boxes, and where we sit. */
  const context = () => {
    const pos = getPos();
    if (typeof pos !== "number") return null;
    const $pos = editor.state.doc.resolve(pos);
    if ($pos.parent.type.name !== "brsGrid") return null;
    const index = $pos.index();
    const others: GridBox[] = [];
    $pos.parent.forEach((child, _offset, i) => {
      if (i !== index) others.push(boxOf(child));
    });
    return { $pos, index, others };
  };

  /**
   * Write a new position and put the cells back in reading order, in
   * ONE transaction — so Ctrl+Z undoes the whole gesture rather than
   * unpicking a move from a re-sort.
   *
   * The content is replaced wholesale rather than nudged with
   * updateAttributes, because the ORDER is part of what changed and
   * there is no attribute for order.
   */
  const commit = (box: GridBox) => {
    const ctx = context();
    if (!ctx) return;
    const { $pos, index } = ctx;

    const kids: { json: ReturnType<typeof node.toJSON>; box: GridBox }[] = [];
    $pos.parent.forEach((child, _offset, i) => {
      const json = child.toJSON() as { attrs?: Record<string, unknown> };
      if (i === index) json.attrs = { ...(json.attrs ?? {}), ...box };
      kids.push({ json, box: i === index ? box : boxOf(child) });
    });
    kids.sort((a, b) => gridReadingOrder(a.box, b.box));

    const from = $pos.start();
    const to = $pos.end();
    const fragment = editor.schema.nodeFromJSON({
      type: "brsGrid",
      content: kids.map((k) => k.json),
    }).content;

    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.replaceWith(from, to, fragment);
        return true;
      })
      .run();
  };

  /** Move to a wanted box, sliding down past anything in the way. */
  const place = (want: GridBox) => {
    const ctx = context();
    if (!ctx) return;
    const free = gridFreeSpot(want, ctx.others);
    if (free.x === stored.x && free.y === stored.y && free.w === stored.w && free.h === stored.h) {
      return;
    }
    commit(free);
  };

  /* ── The gesture ──────────────────────────────────────────────────
     The ghost — the outline showing where this will land — is painted
     by setting four custom properties on the GRID element, because a
     cell cannot draw outside itself and the ghost has to appear at a
     square the cell is not in yet. Transient and purely visual; no
     document state is touched until the pointer comes up. */
  const gesture = (
    e: React.PointerEvent,
    mode: "move" | "resize",
  ) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();

    const rail = track();
    const grid = shell.current?.closest(".rt-grid") as HTMLElement | null;
    if (!rail || !grid) return;

    const rect = rail.getBoundingClientRect();
    const colW = rect.width / RICH_GRID_COLS;
    const baseRowPx =
      Number.parseFloat(getComputedStyle(grid).getPropertyValue("--rt-row-px")) || 40;
    const rows = rowMetrics(rail, baseRowPx);

    /* The ghost is drawn inside `.rt-grid`, which may not start at the
       same point as the grid itself once a background gives it padding.
       Measured rather than assumed. */
    const gridRect = grid.getBoundingClientRect();
    const inset = { x: rect.left - gridRect.left, y: rect.top - gridRect.top };

    const startCol = Math.floor((e.clientX - rect.left) / colW);
    const startRow = rows.indexAt(e.clientY - rect.top);
    let want: GridBox = { ...stored };

    grid.classList.add("rt-grid-dragging");

    const move = (ev: PointerEvent) => {
      const col = Math.floor((ev.clientX - rect.left) / colW);
      const row = rows.indexAt(ev.clientY - rect.top);

      if (mode === "move") {
        want = {
          x: gridX(stored.x + (col - startCol)),
          y: gridY(stored.y + (row - startRow)),
          w: stored.w,
          h: stored.h,
        };
        // A cell that would hang off the right edge stops at it rather
        // than wrapping — the same clamp gridWAt applies when reading.
        want.x = Math.min(want.x, RICH_GRID_COLS - want.w);
      } else {
        want = {
          x: stored.x,
          y: stored.y,
          w: gridW(Math.min(stored.w + (col - startCol), RICH_GRID_COLS - stored.x)),
          h: gridH(stored.h + (row - startRow)),
        };
      }

      /* PIXELS, NOT GRID LINES. The ghost lives outside the grid — it
         is a sibling of the content, because ProseMirror owns what goes
         inside — so it cannot be placed by `grid-column`. Measuring is
         exact anyway, and it is the same measurement the drop uses. */
      grid.style.setProperty("--gl", `${Math.round(inset.x + want.x * colW)}px`);
      grid.style.setProperty("--gt", `${Math.round(inset.y + rows.offset(want.y))}px`);
      grid.style.setProperty("--gw", `${Math.round(want.w * colW)}px`);
      grid.style.setProperty("--gh", `${Math.round(rows.height(want.y, want.h))}px`);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      grid.classList.remove("rt-grid-dragging");
      place(want);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /* Arrow keys nudge by one square. Not a nicety: it is the only way to
     place a cell exactly without a mouse, and the only way to do it at
     all with a keyboard. */
  const onGrabKey = (e: React.KeyboardEvent) => {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    place({
      x: Math.min(gridX(stored.x + d[0]), RICH_GRID_COLS - stored.w),
      y: gridY(stored.y + d[1]),
      w: stored.w,
      h: stored.h,
    });
  };

  const remove = () => {
    const ctx = context();
    if (!ctx) return;
    const { $pos } = ctx;
    // A grid cannot hold zero cells; the last one takes it with it.
    if ($pos.parent.childCount <= 1) {
      editor.chain().focus().deleteRange({ from: $pos.before(), to: $pos.after() }).run();
      return;
    }
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
  };

  return (
    <NodeViewWrapper
      className={`rt-cell rt-cell-${align} rt-cell-v-${valign} rt-cell-shell`}
      style={
        {
          "--cx": stored.x + 1,
          "--cy": stored.y + 1,
          "--cw": stored.w,
          "--ch": stored.h,
        } as React.CSSProperties
      }
    >
      <div ref={shell} className="rt-cell-inner">
        <NodeViewContent className="rt-cell-body" />
      </div>

      {editable ? (
        <>
          <button
            type="button"
            className="rt-cell-grab"
            title="Drag to move · arrow keys nudge one square"
            aria-label="Move this box"
            onPointerDown={(e) => gesture(e, "move")}
            onKeyDown={onGrabKey}
          >
            <span aria-hidden="true" />
          </button>
          <span
            className="rt-cell-size"
            title="Drag to resize"
            aria-hidden="true"
            onPointerDown={(e) => gesture(e, "resize")}
          />

          <Tools>
            <span className="text-micro uppercase tabular text-text-tertiary">
              {stored.w}×{stored.h}
            </span>
            <span aria-hidden="true" className="h-5 w-px bg-line-hairline" />
            {RICH_CELL_ALIGNS.map((a) => (
              <Chip
                key={a}
                title={`Text ${a}`}
                active={align === a}
                onPress={() => updateAttributes({ align: a })}
              >
                {a}
              </Chip>
            ))}
            <span aria-hidden="true" className="h-5 w-px bg-line-hairline" />
            {RICH_CELL_VALIGNS.map((v) => (
              <Chip
                key={v}
                title={`Sit at the ${v} of the box`}
                active={valign === v}
                onPress={() => updateAttributes({ valign: v })}
              >
                {v}
              </Chip>
            ))}
            <Chip title="Remove this box" onPress={remove}>
              Remove
            </Chip>
          </Tools>
        </>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsCell = Node.create({
  name: "brsCell",
  content: "block+",
  isolating: true,
  defining: true,
  selectable: false,

  addAttributes() {
    return {
      x: {
        default: 0,
        parseHTML: (el: HTMLElement) => gridX(el.getAttribute("data-x")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-x": String(gridX(a.x)) }),
      },
      y: {
        default: 0,
        parseHTML: (el: HTMLElement) => gridY(el.getAttribute("data-y")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-y": String(gridY(a.y)) }),
      },
      w: {
        default: 6,
        parseHTML: (el: HTMLElement) => gridW(el.getAttribute("data-w")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-w": String(gridW(a.w)) }),
      },
      h: {
        default: 2,
        parseHTML: (el: HTMLElement) => gridH(el.getAttribute("data-h")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-h": String(gridH(a.h)) }),
      },
      align: {
        default: RICH_CELL_ALIGN_DEFAULT,
        parseHTML: (el: HTMLElement) => cellAlign(el.getAttribute("data-align")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-align": cellAlign(a.align) }),
      },
      valign: {
        default: RICH_CELL_VALIGN_DEFAULT,
        parseHTML: (el: HTMLElement) => cellVAlign(el.getAttribute("data-valign")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-valign": cellVAlign(a.valign) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-cell]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-cell": "", class: "rt-cell" }), 0];
  },

  /**
   * THE PLACEMENT GOES ON THE MOUNT, NOT ON THE BOX.
   *
   * Tiptap does not hand a React node view straight to ProseMirror. It
   * builds its own element — `<div class="react-renderer">` — and
   * renders the component INSIDE it, so what the grid actually sees as
   * its child is that mount, and `NodeViewWrapper` is one level down.
   *
   * A `grid-column` on the wrapper is therefore a grid property on
   * something that is not a grid item, which CSS ignores in silence.
   * The mount auto-placed itself into the next free slot — one column
   * of twenty-four, about forty pixels — and a paragraph inside it
   * wrapped one letter per line. It looked like the grid was broken;
   * the grid was never consulted.
   *
   * So the four numbers are written onto the MOUNT, where they land on
   * the element the grid is really placing. `attrs` as a FUNCTION and
   * not an object, because an object is applied once at mount and these
   * change on every drag — see updateElementAttributes in
   * @tiptap/react, which re-runs the function on each node update.
   *
   * Every value interpolated below has been through this project's own
   * clamps, so the style attribute cannot carry a character an author
   * chose — the same rule the renderer follows.
   */
  addNodeView() {
    return ReactNodeViewRenderer(CellView, {
      className: "rt-cell-mount",
      attrs: ({ node }) => ({
        style:
          `--cx:${gridX(node.attrs.x) + 1};` +
          `--cy:${gridY(node.attrs.y) + 1};` +
          `--cw:${gridWAt(node.attrs.x, node.attrs.w)};` +
          `--ch:${gridH(node.attrs.h)};`,
      }),
    });
  },
});

function GridView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const density = gridDensity(node.attrs.density);
  const tone = sectionTone(node.attrs.tone);
  const scrim = sectionScrim(node.attrs.scrim);
  const assetId = typeof node.attrs.assetId === "string" ? node.attrs.assetId : "";
  const [asset, setAsset] = useState<AssetRow | null>(() => peekAsset(assetId));

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      return;
    }
    setAsset(peekAsset(assetId));
    void loadAsset(assetId).then(setAsset);
    return onAssetsChanged(() => setAsset(peekAsset(assetId)));
  }, [assetId]);

  /** A new box lands on the first clear row under everything already
   *  here, so adding one never covers what is already arranged. */
  const addCell = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const taken: GridBox[] = [];
    node.forEach((child) => taken.push(boxOf(child)));
    const spot = gridFreeSpot({ x: 0, y: 0, w: 6, h: 2 }, taken);

    editor
      .chain()
      .focus()
      .insertContentAt(pos + node.nodeSize - 1, {
        type: "brsCell",
        attrs: { ...spot },
        content: [{ type: "paragraph" }],
      })
      .run();
  };

  const pickBackground = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.view.dom.dispatchEvent(
      new CustomEvent(RT_PICK_BAND_EVENT, { bubbles: true, detail: { pos } }),
    );
  };

  const rowRem = gridRowRem(density);

  return (
    <NodeViewWrapper
      className={`rt-grid rt-grid-${tone} rt-grid-d-${density}${
        asset ? " rt-grid-photo" : ""
      } rt-grid-shell`}
      style={
        {
          "--rt-row": `${rowRem}rem`,
          // The same number in pixels, for the drag arithmetic to read
          // back without having to parse a rem out of a stylesheet.
          "--rt-row-px": `${rowRem * 16}`,
        } as React.CSSProperties
      }
    >
      {asset ? (
        <div className="rt-grid-bg" contentEditable={false} aria-hidden="true">
          <img src={assetUrl(asset)} alt="" />
        </div>
      ) : null}
      {asset && scrim !== "none" ? (
        <div
          className={`rt-band-scrim rt-band-scrim-${scrim}`}
          contentEditable={false}
          aria-hidden="true"
        />
      ) : null}

      {/* The ghost: where the box being dragged will land. Positioned
          from four custom properties the dragging cell sets on this
          element — a cell cannot draw outside itself, and the ghost has
          to appear at a square the cell is not in yet. */}
      <span className="rt-grid-ghost" contentEditable={false} aria-hidden="true" />

      <NodeViewContent className="rt-grid-stage" />

      {editor.isEditable ? (
        <Tools handle>
          <Chip title="Add another box" onPress={addCell}>
            + Box
          </Chip>
          <Picker
            label="Row height"
            value={density}
            onChange={(v) => updateAttributes({ density: v })}
          >
            {RICH_GRID_DENSITIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Picker>
          <Picker label="Background colour" value={tone} onChange={(v) => updateAttributes({ tone: v })}>
            {RICH_SECTION_TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Picker>
          {asset ? (
            <Picker label="Scrim" value={scrim} onChange={(v) => updateAttributes({ scrim: v })}>
              {RICH_SECTION_SCRIMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Picker>
          ) : null}
          <Chip title="Choose a background photograph" onPress={pickBackground}>
            {asset ? "Change photo" : "Background…"}
          </Chip>
          {asset ? (
            <Chip title="Remove the background" onPress={() => updateAttributes({ assetId: null })}>
              Clear photo
            </Chip>
          ) : null}
          <Chip title="Remove this layout area" onPress={deleteNode}>
            Remove area
          </Chip>
        </Tools>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsGrid = Node.create({
  name: "brsGrid",
  group: "block",
  content: "brsCell+",
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      density: {
        default: RICH_GRID_DENSITY_DEFAULT,
        parseHTML: (el: HTMLElement) => gridDensity(el.getAttribute("data-density")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-density": gridDensity(a.density) }),
      },
      tone: {
        default: RICH_SECTION_TONE_DEFAULT,
        parseHTML: (el: HTMLElement) => sectionTone(el.getAttribute("data-tone")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-tone": sectionTone(a.tone) }),
      },
      scrim: {
        default: RICH_SECTION_SCRIM_DEFAULT,
        parseHTML: (el: HTMLElement) => sectionScrim(el.getAttribute("data-scrim")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-scrim": sectionScrim(a.scrim) }),
      },
      assetId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-asset-id"),
        renderHTML: (a: Record<string, unknown>) =>
          a.assetId ? { "data-asset-id": String(a.assetId) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-rt-grid": "", class: "rt-grid" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GridView);
  },
});

/** A new layout area: one box, top-left, ready to be typed into and
 *  dragged. Twelve columns wide — half the area, which is the width a
 *  first box wants often enough to be the default. */
export const emptyGrid = () => ({
  type: "brsGrid",
  content: [
    {
      type: "brsCell",
      attrs: { x: 0, y: 0, w: 12, h: 3 },
      content: [{ type: "heading", attrs: { level: 2 } }],
    },
  ],
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
 *
 * THE ORDER IN THIS ARRAY IS NOT THE SCHEMA'S ORDER. Tiptap resolves the
 * content expressions after every extension has been read, so BrsColumns
 * naming `brsCard+` before BrsCard is declared is fine. They are kept
 * adjacent for the reader, not for the parser.
 */
/* ══ BrsTab ═══════════════════════════════════════════════════════════
 *
 * TAB IS A BIG SPACE, PUT WHERE THE CARET IS.
 *
 * Before this, Tab was bound in exactly one place — inside a table, to
 * step to the next cell — and everywhere else the browser took it and
 * moved focus to the next control on the page. Pressing Tab in the
 * middle of a sentence threw the writer out of the editor entirely,
 * which is the single most startling thing a writing surface can do.
 *
 * ── WHY A GAP AT THE CARET AND NOT A LEVEL ON THE BLOCK ──
 * The first answer to that was an indent LEVEL: Tab set a number on the
 * paragraph and the stylesheet turned it into a left margin. It read
 * well and it was the wrong thing, in two ways the writer met within a
 * minute of using it:
 *
 *   · A MARGIN IS ALWAYS AT THE FRONT. The caret sits mid-sentence, the
 *     writer presses Tab expecting a gap THERE, and the whole paragraph
 *     shifts instead. There is no position at which a block margin can
 *     be a gap between two words, because it is not in the text.
 *   · A LEVEL RAN OUT. Six of them, and the margin was additionally
 *     capped at 45% of the measure so a deep indent could not eat a
 *     phone's column — so Tab moved the line to about the middle and
 *     then did nothing at all, however many times it was pressed.
 *
 * So a tab is a THING IN THE TEXT now: an inline node, inserted at the
 * caret, as many as anybody wants, anywhere in the line.
 *
 * ── WHY A NODE AND NOT SPACES ──
 * The width of a run of spaces depends on the font, HTML collapses
 * them, and Backspace takes them back one at a time — so "how wide is a
 * tab" would be a different answer in every paragraph and undoing one
 * would be four presses. An empty node with a width in the stylesheet
 * is one press to make, one press to delete, the same width everywhere,
 * and the same width in the editor as on the page because both read the
 * same rule.
 *
 * ── WHY PRIORITY 90 ──
 * Tiptap offers a key to the highest-priority extension first. Tab
 * already means something more specific in two places, and both must
 * keep it: inside a table it steps to the next cell, inside a list it
 * nests the item. Both sit at the default 100 and both return false
 * when they do not apply, so sitting BELOW them means this catches
 * exactly the presses neither of them wanted.
 *
 * ── WHY IT ALWAYS RETURNS TRUE ──
 * Even where nothing was inserted, and even for a Shift-Tab with no gap
 * behind it. Returning false would hand the key back to the browser and
 * the writer would be thrown out of the editor in one paragraph but not
 * in the next — a keyboard trap is bad, but an intermittent one is
 * worse.
 *
 * ── SO ESCAPE IS THE WAY OUT, AND IT HAS TO EXIST ──
 * Consuming Tab unconditionally means somebody navigating by keyboard
 * alone can enter this editor and never leave it. That is not a
 * trade-off worth making silently, so Escape blurs. Blurring — rather
 * than moving focus somewhere chosen here — is what keeps the browser's
 * own sequential-navigation starting point on the editor, so the next
 * Tab goes to whatever genuinely follows it in the form.
 *
 * Safe to bind despite the slash menu already using Escape: that
 * listener is CAPTURING on the same element and calls stopPropagation
 * while the menu is open, so an Escape meant for the menu never reaches
 * ProseMirror and never reaches this.
 */
export const BrsTab = Node.create({
  name: "brsTab",
  group: "inline",
  inline: true,
  /* An atom: it has no content and the caret does not go inside it. It
     is one object to step over with an arrow key and one object to take
     back with a Backspace, which is what a tab should be.

     NOT selectable, because a gap is not a thing to select — clicking
     one would otherwise put a blue box around a piece of empty space
     and swallow the click that was meant to place the caret. */
  atom: true,
  selectable: false,
  priority: 90,

  parseHTML() {
    return [{ tag: "span[data-rt-tab]" }];
  },

  renderHTML() {
    return ["span", { "data-rt-tab": "", class: "rt-tab" }];
  },

  addKeyboardShortcuts() {
    /* Whatever was selected is what a tab replaces, exactly as typing a
       character over a selection would. */
    const insert = (): boolean =>
      this.editor.commands.command(({ tr, state, dispatch }) => {
        /* The schema is this extension's own, so the lookup cannot
           miss — but it is typed as "maybe", and a Tab that threw would
           be a Tab that escaped to the browser. */
        const tab = state.schema.nodes[this.name];
        if (tab && dispatch) dispatch(tr.replaceSelectionWith(tab.create()).scrollIntoView());
        return true;
      });

    /* THE OPPOSITE OF TAB IS TAKING THE LAST ONE BACK, and only that:
       Shift-Tab immediately behind a gap removes it, and Shift-Tab
       anywhere else does nothing rather than deleting whatever letter
       happens to be there. */
    const remove = (): boolean =>
      this.editor.commands.command(({ tr, state, dispatch }) => {
        const { empty, $from } = state.selection;
        const before = empty ? $from.nodeBefore : null;
        if (before?.type.name === "brsTab" && dispatch) {
          dispatch(tr.delete($from.pos - before.nodeSize, $from.pos).scrollIntoView());
        }
        return true;
      });

    return {
      Tab: insert,
      "Shift-Tab": remove,
      Escape: () => {
        if (!this.editor.isFocused) return false;
        this.editor.commands.blur();
        return true;
      },
    };
  },
});

/* ══ BrsMotion ════════════════════════════════════════════════════════
 *
 * THE ENTRANCE, THE STAGGER AND THE HOVER, AS ATTRIBUTES ON BLOCKS THAT
 * ALREADY EXIST.
 *
 * Not a wrapper node. The obvious build of "animate this block" is a
 * node that contains the thing being animated, and it is wrong here for
 * three reasons this schema has already paid for elsewhere: it changes
 * the document's shape, so every renderer and every walker learns a new
 * container; it puts a box between a card and the row that positions
 * it, which breaks the grid; and a writer who wants to change the
 * effect has to select the right one of two nested things. An attribute
 * changes nothing structural — a paragraph with an entrance is still a
 * paragraph, and richDocToText, the grid and the renderer are all
 * untouched.
 *
 * ── WHAT CARRIES WHAT ──
 * ANIMATED is nearly everything, because the writer's instinct ("that
 * one should arrive") does not care what kind of block it is.
 * STAGGERED is only containers, because it is a statement about a row.
 * HOVERED is only the things a pointer has a reason to be over: a card,
 * a button, a picture.
 *
 * Nothing is animated by default, and `null` writes no attribute at
 * all, so nothing in the archive changed the day this shipped.
 */

/** Blocks that can be given an entrance. */
export const ANIMATABLE = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "horizontalRule",
  "table",
  "brsImage",
  "brsEmbed",
  "brsPdf",
  "brsCard",
  "brsColumns",
  "brsCallout",
  "brsDetails",
  "brsSection",
  "brsGrid",
  "brsCell",
  "brsCount",
  "brsCountdown",
];

/** Containers whose children can arrive one after another. */
export const STAGGERABLE = ["brsColumns", "brsGrid", "brsSection", "bulletList", "orderedList"];

/** Things a pointer has a reason to be over. */
export const HOVERABLE = ["brsCard", "brsButton", "brsImage", "brsCell"];

/** The blocks that are made OF text rather than of other blocks. */
const TEXT_BLOCKS = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "horizontalRule",
]);

/** The two containers that are one THING to a reader rather than a
 *  region of the page. See the note in motionTarget. */
const ONE_THING = new Set(["brsCard", "brsCell"]);

/**
 * THE BLOCK A MOTION CONTROL IS ABOUT.
 *
 * "Apply this to the current block" is ambiguous in a document where
 * blocks nest: a cursor in a heading, inside a card, inside a row of
 * three, is inside three animatable things at once. Innermost wins,
 * because that is the one the writer is looking at — with ONE exception,
 * which was found by using it:
 *
 * ── A CARD ARRIVES AS A CARD ──
 * Click a segment card's title, choose "Rise up", and what the writer
 * means is that the CARD rises. Innermost-wins gave it to the heading,
 * so the bordered box sat still while the words inside it slid about —
 * which does not read as an entrance, it reads as a bug. So a text
 * block inside a card or a grid cell yields to the box it is in.
 *
 * The regions do NOT capture it that way: a band, a grid and a row of
 * columns are page furniture holding many blocks, and a writer who
 * animates one paragraph inside a band means that paragraph. Those are
 * also exactly the containers that carry the STAGGER, which only means
 * anything when their children animate one at a time — so capturing
 * would have broken the feature they exist for. Selecting the region
 * itself still animates the whole region.
 *
 * A whole node selected — a picture, a PDF, a counter — is the
 * unambiguous case and is checked first.
 */
export function motionTarget(
  state: EditorState,
  allowed: readonly string[],
): { pos: number; node: PMNodeType } | null {
  const ok = new Set(allowed);
  const sel = state.selection;

  if (sel instanceof NodeSelection && ok.has(sel.node.type.name)) {
    return { pos: sel.from, node: sel.node };
  }

  const $from = sel.$from;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (!ok.has(node.type.name)) continue;

    const parent = d > 1 ? $from.node(d - 1) : null;
    if (TEXT_BLOCKS.has(node.type.name) && parent && ONE_THING.has(parent.type.name)) {
      // The box, not the words in it — and only when the box is
      // something this control can actually be set on.
      if (ok.has(parent.type.name)) return { pos: $from.before(d - 1), node: parent };
    }
    return { pos: $from.before(d), node };
  }
  return null;
}

/** Read one motion attribute off whichever block owns it. */
export function motionAttr(
  state: EditorState,
  allowed: readonly string[],
  key: string,
): unknown {
  return motionTarget(state, allowed)?.node.attrs[key];
}

/** Write one, as a single undo step. Returns false when the cursor is
 *  not in anything that carries it, so the toolbar can grey out. */
export function setMotionAttr(
  editor: Editor,
  allowed: readonly string[],
  key: string,
  value: unknown,
): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr, state, dispatch }) => {
      const target = motionTarget(state, allowed);
      if (!target) return false;
      if (dispatch) tr.setNodeAttribute(target.pos, key, value);
      return true;
    })
    .run();
}

export const BrsMotion = Extension.create({
  name: "brsMotion",

  addGlobalAttributes() {
    return [
      {
        types: ANIMATABLE,
        attributes: {
          anim: {
            default: null,
            parseHTML: (el: HTMLElement) => richAnim(el.getAttribute("data-rt-anim")),
            renderHTML: (a: Record<string, unknown>) => {
              const v = richAnim(a.anim);
              return v ? { "data-rt-anim": v } : {};
            },
          },
        },
      },
      {
        types: STAGGERABLE,
        attributes: {
          stagger: {
            default: false,
            parseHTML: (el: HTMLElement) => el.hasAttribute("data-rt-stagger"),
            renderHTML: (a: Record<string, unknown>) =>
              richStagger(a.stagger) ? { "data-rt-stagger": "" } : {},
          },
        },
      },
      {
        types: HOVERABLE,
        attributes: {
          hover: {
            default: null,
            parseHTML: (el: HTMLElement) => richHover(el.getAttribute("data-rt-hover")),
            renderHTML: (a: Record<string, unknown>) => {
              const v = richHover(a.hover);
              return v ? { "data-rt-hover": v } : {};
            },
          },
        },
      },
    ];
  },
});

/* ══ BrsCount ═════════════════════════════════════════════════════════
 *
 * A HEADLINE FIGURE THAT ARRIVES FROM ZERO.
 *
 * WHAT IS STORED IS THE NUMBER, AND THE PAGE IS CORRECT BEFORE ANY
 * SCRIPT RUNS. The build writes 250; the script sets it to 0 and climbs
 * back to 250 when the reader reaches it. So a reader with no
 * JavaScript sees 250, a crawler indexes 250, and a print stylesheet
 * gets 250 — none of which is true of the usual build, where the markup
 * says 0 and the real number exists only in a data attribute.
 *
 * The prefix and suffix are separate fields rather than part of the
 * label because they belong to the NUMBER: "৳50,000" and "12+" have to
 * climb with it and stay glued to it, and a label sits underneath in
 * different type.
 */
function CountView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const to = countTo(node.attrs.to);
  const prefix = countText(node.attrs.prefix, 8);
  const suffix = countText(node.attrs.suffix, 8);
  const label = countText(node.attrs.label);
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      className={`rt-node${selected ? " rt-node-selected" : ""}`}
      data-drag-handle
    >
      {/* The number as the reader will see it when it has finished
          climbing. The editor never animates: a page of counters all
          running while somebody is trying to type a label is a
          fairground, and Preview is where motion belongs. */}
      <span className="rt-count">
        <span className="rt-count-value">
          {prefix}
          {to.toLocaleString("en-GB")}
          {suffix}
        </span>
        {label ? <span className="rt-count-label">{label}</span> : null}
      </span>

      {editable && selected ? (
        <div
          className="rt-toolbar flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <label className="text-micro uppercase text-text-secondary">
            Counts to
            <input
              type="number"
              min={0}
              value={to}
              onChange={(e) => updateAttributes({ to: countTo(e.target.value) })}
              className="adm-input ml-2 w-28 py-1 text-body-s"
            />
          </label>
          <label className="text-micro uppercase text-text-secondary">
            Before
            <input
              value={prefix}
              placeholder="৳"
              onChange={(e) => updateAttributes({ prefix: countText(e.target.value, 8) })}
              className="adm-input ml-2 w-16 py-1 text-body-s"
            />
          </label>
          <label className="text-micro uppercase text-text-secondary">
            After
            <input
              value={suffix}
              placeholder="+"
              onChange={(e) => updateAttributes({ suffix: countText(e.target.value, 8) })}
              className="adm-input ml-2 w-16 py-1 text-body-s"
            />
          </label>
          <label className="text-micro uppercase text-text-secondary">
            Label
            <input
              value={label}
              placeholder="Participants"
              onChange={(e) => updateAttributes({ label: countText(e.target.value) })}
              className="adm-input ml-2 w-40 py-1 text-body-s"
            />
          </label>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteNode();
            }}
            className="ml-auto border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsCount = Node.create({
  name: "brsCount",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      to: {
        default: 0,
        parseHTML: (el: HTMLElement) => countTo(el.getAttribute("data-to")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-to": String(countTo(a.to)) }),
      },
      prefix: {
        default: "",
        parseHTML: (el: HTMLElement) => countText(el.getAttribute("data-prefix"), 8),
        renderHTML: (a: Record<string, unknown>) => {
          const v = countText(a.prefix, 8);
          return v ? { "data-prefix": v } : {};
        },
      },
      suffix: {
        default: "",
        parseHTML: (el: HTMLElement) => countText(el.getAttribute("data-suffix"), 8),
        renderHTML: (a: Record<string, unknown>) => {
          const v = countText(a.suffix, 8);
          return v ? { "data-suffix": v } : {};
        },
      },
      label: {
        default: "",
        parseHTML: (el: HTMLElement) => countText(el.getAttribute("data-label")),
        renderHTML: (a: Record<string, unknown>) => {
          const v = countText(a.label);
          return v ? { "data-label": v } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-rt-count]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-rt-count": "", class: "rt-count" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CountView);
  },
});

/* ══ BrsCountdown ═════════════════════════════════════════════════════
 *
 * DAYS, HOURS, MINUTES AND SECONDS UNTIL THE THING HAPPENS.
 *
 * ── WHAT THE BUILD WRITES IS A SENTENCE, NOT FOUR ZEROES ──
 * A countdown is the one block whose correct value cannot be baked: it
 * is different every second, and a static site is built once. The usual
 * answer is to ship four boxes reading 00 and let the script fill them
 * in, which means a reader without JavaScript is told the event is
 * happening right now.
 *
 * So the build writes the fact it actually knows — "Until 14 March 2026,
 * 9:00 am" — and the script REPLACES that sentence with the ticking
 * cells. Same shape as the video facade on the event page: the markup
 * without script is a true, useful thing rather than a broken version
 * of the real one.
 *
 * ── AND IT STOPS ──
 * A countdown past its date counts UP forever if nobody thought about
 * it, which is how you get "-412 days" on a society's homepage. Past
 * the instant, the script writes the finished line instead.
 */
function CountdownView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const to = countdownAt(node.attrs.to);
  const label = countText(node.attrs.label);
  const editable = editor.isEditable;

  /* `datetime-local` wants "YYYY-MM-DDTHH:mm" in LOCAL time, and the
     document stores UTC — so the box is filled from the local reading of
     the instant, and what the box gives back is turned into an instant
     again on the way in. Storing the local string would make the
     countdown mean a different moment in every timezone that opened it. */
  const localValue = (() => {
    if (!to) return "";
    const d = new Date(to);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const pretty = to
    ? new Date(to).toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <NodeViewWrapper
      className={`rt-node${selected ? " rt-node-selected" : ""}`}
      data-drag-handle
    >
      <div className="rt-countdown">
        {to ? (
          (["Days", "Hours", "Minutes", "Seconds"] as const).map((unit) => (
            <span key={unit} className="rt-countdown-cell">
              <span className="rt-countdown-n">00</span>
              <span className="rt-countdown-u">{unit}</span>
            </span>
          ))
        ) : (
          <span className="rt-countdown-date">
            No date set — this will not publish until one is chosen.
          </span>
        )}
      </div>
      {label ? <p className="rt-count-label">{label}</p> : null}

      {editable && selected ? (
        <div
          className="rt-toolbar flex flex-wrap items-center gap-2 border border-line-strong bg-bg-raised p-2"
          contentEditable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <label className="text-micro uppercase text-text-secondary">
            Counts down to
            <input
              type="datetime-local"
              value={localValue}
              onChange={(e) => {
                const raw = e.target.value;
                updateAttributes({ to: raw ? countdownAt(new Date(raw).toISOString()) : null });
              }}
              className="adm-input ml-2 w-56 py-1 text-body-s"
            />
          </label>
          <label className="text-micro uppercase text-text-secondary">
            Label
            <input
              value={label}
              placeholder="Until registration closes"
              onChange={(e) => updateAttributes({ label: countText(e.target.value) })}
              className="adm-input ml-2 w-56 py-1 text-body-s"
            />
          </label>
          {pretty ? (
            <span className="font-mono text-micro text-text-tertiary">{pretty}</span>
          ) : null}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteNode();
            }}
            className="ml-auto border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
          >
            Remove
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const BrsCountdown = Node.create({
  name: "brsCountdown",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      to: {
        default: null,
        parseHTML: (el: HTMLElement) => countdownAt(el.getAttribute("data-to")),
        renderHTML: (a: Record<string, unknown>) => {
          const v = countdownAt(a.to);
          return v ? { "data-to": v } : {};
        },
      },
      label: {
        default: "",
        parseHTML: (el: HTMLElement) => countText(el.getAttribute("data-label")),
        renderHTML: (a: Record<string, unknown>) => {
          const v = countText(a.label);
          return v ? { "data-label": v } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rt-countdown]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-rt-countdown": "", class: "rt-countdown" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CountdownView);
  },
});

export const RICH_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [...RICH_HEADING_LEVELS] },
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
  BrsStyle,
  BrsImage,
  BrsEmbed,
  BrsPdf,
  BrsButton,
  /* Order matters to nothing here EXCEPT readability — but the two go
     together and a row without a card is a schema error at startup
     rather than at runtime, so they are never separated. */
  BrsColumns,
  BrsCard,
  BrsCallout,
  BrsSpacer,
  BrsDetails,
  BrsSummary,
  BrsSection,
  BrsTable,
  BrsTableRow,
  BrsTableCell,
  BrsTableHeader,
  BrsGrid,
  BrsCell,
  /* Last, and neither is a node. The grab handle lets every block ABOVE
     be picked up and dropped somewhere else; BrsTab gives Tab a
     meaning inside the editor so it stops throwing the writer out of
     it. Its priority puts it below the table's Tab and the list's. */
  BrsCount,
  BrsCountdown,
  BrsDragHandle,
  BrsTab,
  /* LAST, and the only one that is not a node or a mark: it adds the
     entrance, the stagger and the hover to blocks declared above it.
     Global attributes are collected after every extension is read, so
     its position here is for the reader rather than the parser. */
  BrsMotion,
];
