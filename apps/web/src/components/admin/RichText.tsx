"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * A WRITING SURFACE, NOT A SYNTAX.
 *
 * Asking a committee member to type `**bold**` is asking them to learn a
 * markup language in order to write a paragraph about a workshop. This
 * is the toolbar instead: select the words, press B.
 *
 * ── WHAT REPLACED WHAT, AND WHY ──
 * This was a contenteditable driven by document.execCommand, serialising
 * to markdown on every keystroke. That build was correct for the feature
 * set it had, and it could not grow into this one:
 *
 *   · MARKDOWN CANNOT SAY IT. Font, size, colour, highlight, alignment,
 *     an inline picture, a video — none of the seven has a markdown
 *     spelling. The storage format was the ceiling, not the toolbar.
 *   · execCommand IS DEPRECATED AND INCONSISTENT. `fontName` emits
 *     <font> tags; nesting differs per browser; there is no concept of
 *     a selectable, alignable image node at all. Two of the bugs the old
 *     file documents in its own comments — Chrome's <div> separator, a
 *     <ul> nested inside a <p> — were that API, not our use of it.
 *
 * So the editor is Tiptap (ProseMirror), and the storage format is its
 * document tree. See lib/richtext/render.ts for why JSON and not HTML —
 * the short version is that the published page must never render
 * author-supplied HTML, and with a JSON tree it provably cannot.
 *
 * ── ONE EDITOR, TWO SCREENS ──
 * Events and blog posts both use this. They were always going to drift
 * into two implementations otherwise, and the second one is always the
 * one nobody maintains.
 *
 * ── OLD WRITE-UPS ARE CONVERTED ON OPEN, NOT MIGRATED IN BULK ──
 * The archive holds markdown. Opening one renders it through the
 * existing lib/markdown.ts — the escape-everything renderer — and lets
 * Tiptap parse that known-inert HTML into a document. Saving then writes
 * `doc`. Nothing converts until somebody edits it, which means a bad
 * conversion can only ever affect the entry a human is looking at.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Selection } from "@tiptap/pm/state";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { renderMarkdown } from "@/lib/markdown";
import { parseRichDoc } from "@/lib/richtext/render";
import { DeviceBar, deviceProps, useDevice } from "./richtext/DeviceBar";
import { ButtonDialog, ImageDialog, LinkDialog, PdfDialog, VideoDialog } from "./richtext/dialogs";
import {
  RICH_EXTENSIONS,
  RT_EDIT_BUTTON_EVENT,
  RT_PICK_BAND_EVENT,
} from "./richtext/extensions";
import { SlashMenu } from "./richtext/SlashMenu";
import { Toolbar } from "./richtext/Toolbar";

export type RichValue = { content: string; format: "doc" };

export function RichText({
  value,
  format,
  onChange,
  rows = 18,
  attachedAssetIds,
}: {
  /** JSON when `format` is "doc"; markdown otherwise. */
  value: string;
  format: string;
  onChange: (next: RichValue) => void;
  rows?: number;
  /** Photographs already attached to the record being edited. Offered
   *  first in the picture dialog; see ImageDialog. */
  attachedAssetIds?: string[];
}) {
  /* What we last emitted, so a parent re-render does not reset the
     document under a live cursor — which is how an editor sends the
     caret to position zero on every keystroke. */
  const emitted = useRef<string | null>(null);
  const [dialog, setDialog] = useState<"link" | "image" | "video" | "pdf" | "button" | null>(null);
  /* Which band asked for a background, as a document position. Held
     rather than derived, because by the time the picker closes the
     selection is wherever the modal left it — and "the band the strip
     belonged to" is not recoverable from that. */
  const bandPos = useRef<number | null>(null);
  /* Shared with the Preview tab's bar — see DeviceBar. */
  const [device] = useDevice();

  /* Computed once. `value` afterwards is compared against `emitted`
     below rather than re-parsed, because every keystroke changes it. */
  const initial = useMemo((): JSONContent | string => {
    if (format === "doc") {
      const doc = parseRichDoc(value);
      // The cast, and why it is not a hole: PMNode types every field as
      // `unknown` on purpose, because it describes a claim made by a
      // database column rather than a guarantee. parseRichDoc has already
      // checked that this parses and that its type is "doc". Everything
      // below that is Tiptap's problem — it validates against the schema
      // and drops what does not fit, which is the behaviour we want for
      // a column somebody may have edited by hand.
      if (doc) return doc as JSONContent;
    }
    // Markdown, or a 'doc' column holding something that is not a
    // document. renderMarkdown escapes every byte before adding a tag,
    // so what Tiptap parses here cannot contain author-supplied markup.
    return renderMarkdown(value || "");
    /* Empty deps DELIBERATELY. This is the document the editor opens
       with; `value` changes on every keystroke after that, and re-running
       it would rebuild the document under a live cursor. Later changes
       from the parent are handled by the effect below, which compares
       against what we emitted before touching anything. */
  }, []);

  const editor = useEditor({
    extensions: RICH_EXTENSIONS,
    content: initial,
    // Required under `output: "export"`: rendering the editor during SSR
    // produces markup the client then disagrees with.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        /**
         * NO WIDTH IS SET HERE. The writing fills the box, and the box
         * is a form field the width of the form — see globals.css,
         * where the four shapes this has had and the reason for the
         * current one are written down.
         *
         * If a measure is ever wanted back, it belongs on the box, not
         * on this element: a max-width here would leave the same dead
         * strip inside the border that started all of this.
         *
         * `.prose` is what makes the draft LOOK published — same type,
         * same leading, same block spacing as /events/[slug]. Width is
         * the one thing it no longer shares.
         */
        class: "prose rt-doc adm-richtext-body focus:outline-none",
        style: `min-height:${rows * 1.6}rem`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "The write-up",
      },
    },
    onUpdate: ({ editor: e }) => {
      const content = JSON.stringify(e.getJSON());
      emitted.current = content;
      onChange({ content, format: "doc" });
    },
  });

  /* THE ONE THING A NODE VIEW CANNOT DO FOR ITSELF: OPEN A DIALOG.
     A button drawn inside the document needs the same five-field box
     the toolbar opens, and the node view has no way to reach this
     component — ProseMirror constructs it, not React. So it fires an
     event at the editor's own DOM node and this catches it. The node
     view has already selected the button, so the dialog opens knowing
     which one it is editing. */
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const openButton = () => setDialog("button");
    const openBand = (e: Event) => {
      const at = (e as CustomEvent<{ pos?: number }>).detail?.pos;
      bandPos.current = typeof at === "number" ? at : null;
      setDialog("image");
    };

    dom.addEventListener(RT_EDIT_BUTTON_EVENT, openButton);
    dom.addEventListener(RT_PICK_BAND_EVENT, openBand);
    return () => {
      dom.removeEventListener(RT_EDIT_BUTTON_EVENT, openButton);
      dom.removeEventListener(RT_PICK_BAND_EVENT, openBand);
    };
  }, [editor]);

  /* A parent that swaps in a different record — "Back to events", then
     open another one — must replace the document. A parent echoing back
     what we just emitted must not. */
  useEffect(() => {
    if (!editor) return;
    if (format !== "doc") return;
    if (value === emitted.current) return;
    const doc = parseRichDoc(value);
    if (!doc) return;
    editor.commands.setContent(doc as JSONContent, { emitUpdate: false });
    emitted.current = value;
  }, [value, format, editor]);

  if (!editor) {
    return (
      <div
        className="adm-editor px-6 py-4 text-body-s text-text-tertiary"
        style={{ minHeight: `${rows * 1.6}rem` }}
      >
        Loading the editor…
      </div>
    );
  }

  return (
    <div className="adm-editor">
      <DeviceBar />
      <Toolbar
        editor={editor}
        onAddLink={() => setDialog("link")}
        onAddImage={() => setDialog("image")}
        onAddVideo={() => setDialog("video")}
        onAddPdf={() => setDialog("pdf")}
        onAddButton={() => setDialog("button")}
      />

      <div
        className="adm-richtext"
        /* The device width. Applied to the BOX rather than to the
           editable element inside it, so the dashed frame that marks
           the edge of the screen sits outside the writing rather than
           through it. */
        {...deviceProps(device)}
        /**
         * EVERY PIXEL OF THIS BOX PUTS A CURSOR SOMEWHERE.
         *
         * Three regions are not the editable element and all three were
         * dead: the tray around the sheet, the sheet's own margins, and
         * the blank space under the last block. Pressing any of them did
         * nothing at all — which is what "I can only write in half the
         * box" is. It was not a width problem; it was a target problem.
         *
         * What happens instead is what a document editor does: the press
         * is answered by the nearest place in the text. Clicking out in
         * the right-hand margin of a line lands at the END of that line,
         * because the coordinates are clamped into the surface before
         * they are resolved rather than being discarded for falling
         * outside it. Clicking below the last block lands at the end of
         * the document — that one is special-cased, because the nearest
         * position to a press under a photograph is the photograph, and
         * a caret on an object is nowhere to type. Tiptap's
         * trailing-paragraph extension guarantees the end of the
         * document is always a paragraph, even when the last thing
         * written was a picture.
         *
         * `mousedown`, not `click`: the caret has to be placed before
         * the browser decides where the selection goes. A press that
         * lands ON the text — a paragraph, a link, a picture — returns
         * immediately and is left entirely to the browser, which is what
         * makes dragging a selection and dragging a resize handle still
         * work.
         */
        onMouseDown={(e) => {
          const view = editor.view;
          const surface = view.dom as HTMLElement;
          const target = e.target as globalThis.Node;

          // If clicking an interactive control (button, input, toolbar chip, handle), let it handle natively
          if (target instanceof HTMLElement) {
            if (
              target.closest("button, input, select, a, [contenteditable='false'], .rt-btn, .rt-tools, .rt-handle")
            ) {
              return;
            }
          }

          /* A PRESS THAT LANDED ON THE WRITING IS NOT OURS.
             The note above has always said so — "left entirely to the
             browser, which is what makes dragging a selection still
             work" — and the code below never checked, so every press on
             a paragraph was preventDefault()ed and collapsed to a caret.
             Selecting a phrase by dragging, double-clicking a word and
             shift-clicking to extend were all impossible, in the one
             place a writer does them constantly.

             `target !== surface` is the whole subtlety: a press in the
             blank space under the last block DOES land inside the
             editable element — it is the element's own min-height — and
             that one still needs answering below, because the nearest
             position to it may be a photograph rather than a line. */
          if (surface.contains(target) && target !== surface) return;

          e.preventDefault();

          const box = surface.getBoundingClientRect();
          const last = surface.lastElementChild;
          if (!last || e.clientY > last.getBoundingClientRect().bottom) {
            editor.chain().focus("end").run();
            return;
          }

          /* One pixel inside the edge, not on it: posAtCoords resolves
             against what is under the point, and a point exactly on the
             boundary belongs to the element outside. */
          const at = view.posAtCoords({
            left: Math.min(Math.max(e.clientX, box.left + 1), box.right - 1),
            top: Math.min(Math.max(e.clientY, box.top + 1), box.bottom - 1),
          });
          if (!at) {
            editor.chain().focus("end").run();
            return;
          }

          /* Selection.near rather than setTextSelection: the resolved
             position can be between two blocks or alongside a picture,
             and near() walks to the closest place a cursor can actually
             sit instead of throwing. */
          const { state } = view;
          view.dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(at.pos))));
          view.focus();
        }}
        onKeyDown={(e) => {
          // Ctrl+K is the one shortcut Tiptap does not bind for us,
          // because the dialog is ours rather than the Link extension's.
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            setDialog("link");
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <LinkDialog editor={editor} isOpen={dialog === "link"} onClose={() => setDialog(null)} />
      <ButtonDialog editor={editor} isOpen={dialog === "button"} onClose={() => setDialog(null)} />
      <VideoDialog editor={editor} isOpen={dialog === "video"} onClose={() => setDialog(null)} />
      <PdfDialog editor={editor} isOpen={dialog === "pdf"} onClose={() => setDialog(null)} />
      <ImageDialog
        editor={editor}
        isOpen={dialog === "image"}
        onClose={() => {
          bandPos.current = null;
          setDialog(null);
        }}
        attachedAssetIds={attachedAssetIds}
        /* Only when a band asked. Without a position this is the
           ordinary picture picker, unchanged. */
        pickOne={
          bandPos.current === null
            ? undefined
            : (assetId) => {
                const at = bandPos.current;
                if (at === null) return;
                /* setNodeAttribute on a KNOWN position, not
                   updateAttributes on the selection: the selection has
                   been through a modal by now, and the band that asked
                   is the one that must change. */
                editor
                  .chain()
                  .focus()
                  .command(({ tr }) => {
                    tr.setNodeAttribute(at, "assetId", assetId);
                    return true;
                  })
                  .run();
              }
        }
      />

      {/* Rendered last: it is a fixed-position layer over everything,
          and it decides for itself whether it is open. */}
      <SlashMenu
        editor={editor}
        onAddLink={() => setDialog("link")}
        onAddImage={() => setDialog("image")}
        onAddVideo={() => setDialog("video")}
        onAddPdf={() => setDialog("pdf")}
        onAddButton={() => setDialog("button")}
      />
    </div>
  );
}
