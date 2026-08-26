"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * A GRAB HANDLE FOR EVERY BLOCK THAT FLOWS.
 *
 * The other half of "let me drag it where I want it". The layout area
 * in extensions.tsx answers the version of that question that means
 * WHERE ON THE PAGE; this answers the version that means IN WHAT ORDER
 * — pick a paragraph up by a handle and drop it three blocks further
 * down, with a line showing where it will land.
 *
 * They are genuinely different operations. A cell's drag changes four
 * numbers on a node that never moves in the document. This one moves
 * the node and changes no numbers at all. Building either one out of
 * the other produces a control that is wrong half the time.
 *
 * ── WHY THIS IS A PLUGIN AND NOT A NODE VIEW ──
 * Because it has to work on nodes that have no node view: a paragraph,
 * a heading, a list, a blockquote — StarterKit's, which this project
 * does not own and should not fork in order to bolt a handle onto.
 * A plugin watches the pointer, finds whatever block is under it, and
 * parks one shared handle beside it.
 *
 * ── WHY THE HANDLE IS position: fixed ON THE BODY ──
 * The editor sits inside a scrolling admin shell, under a sticky
 * toolbar, inside a bordered sheet. An absolutely-positioned handle
 * would be clipped by one ancestor and offset by another. Viewport
 * coordinates have no ancestors to be wrong about, and the handle is
 * repositioned on the same mousemove that chose the block anyway.
 *
 * ── WHY IT DELEGATES THE ACTUAL DROP TO PROSEMIRROR ──
 * `view.dragging` is the documented seam: set a slice on it and
 * ProseMirror's own drop handling does the rest — validating the target
 * against the schema, mapping the positions, and drawing the drop
 * cursor that StarterKit already installs. Reimplementing that would
 * mean reimplementing "may a heading go inside a table cell", which the
 * schema already answers.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Extension } from "@tiptap/react";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Nodes whose children are themselves worth dragging.
 *
 * Without this the handle always grabs the outermost block, so a
 * paragraph inside a band could only be moved by moving the whole band.
 * Walking up to the innermost of these instead means the handle offers
 * the paragraph when the pointer is over the paragraph, and the band
 * when it is over the band's own margin.
 *
 * brsCell is on the list, so the paragraphs INSIDE a box on the layout
 * area can be reordered like any others. brsGrid is NOT: its children
 * are the boxes themselves, and those are placed by dragging the box,
 * not by dropping one between two others. Offering both would be two
 * gestures for one job on the same element — which is the mistake this
 * editor already made once, at a larger scale, with a free canvas that
 * did the same thing as the grid.
 */
const CONTAINERS = new Set([
  "brsSection",
  "brsCard",
  "brsCallout",
  "brsDetails",
  "brsCell",
  "tableCell",
  "tableHeader",
]);

/** A box on the layout area is moved by its own grab bar, never by this. */
const inGridStage = (view: EditorView, pos: number): boolean =>
  view.state.doc.resolve(pos).parent.type.name === "brsGrid";

type Target = { pos: number; dom: HTMLElement };

/** The block under a point, and the element drawing it. */
function blockAt(view: EditorView, left: number, top: number): Target | null {
  const found = view.posAtCoords({ left, top });
  if (!found) return null;

  const raw = found.inside >= 0 ? found.inside : found.pos;
  const $pos = view.state.doc.resolve(raw);

  /* Depth 0 means the point fell between two top-level blocks rather
     than inside one — the gap under the last paragraph, usually. There
     is nothing to grab there. */
  if ($pos.depth === 0) return null;

  let depth = 1;
  for (let d = $pos.depth; d >= 1; d--) {
    if (CONTAINERS.has($pos.node(d - 1).type.name)) {
      depth = d;
      break;
    }
  }

  const pos = $pos.before(depth);
  if (inGridStage(view, pos)) return null;

  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return null;
  return { pos, dom };
}

function handlePlugin() {
  return new Plugin({
    key: new PluginKey("brsDragHandle"),

    view(view) {
      let target: Target | null = null;

      const handle = document.createElement("div");
      handle.className = "rt-drag-handle";
      handle.draggable = true;
      handle.setAttribute("role", "button");
      handle.setAttribute("aria-label", "Drag to move this block");
      handle.title = "Drag to move · click to select";
      /* Six dots, drawn rather than typed, for the reason the toolbar
         gives: a unicode glyph resolves to a different font and
         baseline on every machine. */
      handle.innerHTML =
        '<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false">' +
        '<circle cx="3" cy="3" r="1.4"/><circle cx="7" cy="3" r="1.4"/>' +
        '<circle cx="3" cy="8" r="1.4"/><circle cx="7" cy="8" r="1.4"/>' +
        '<circle cx="3" cy="13" r="1.4"/><circle cx="7" cy="13" r="1.4"/></svg>';
      document.body.appendChild(handle);

      const hide = () => {
        target = null;
        handle.classList.remove("is-on");
      };

      const place = (t: Target) => {
        const box = t.dom.getBoundingClientRect();
        // Outside the block's left edge, or tucked just inside it when
        // there is no room — a handle off the side of a narrow screen is
        // a handle nobody can reach.
        const left = box.left - 24 < 8 ? box.left + 4 : box.left - 24;
        handle.style.left = `${Math.round(left)}px`;
        handle.style.top = `${Math.round(box.top + 2)}px`;
        handle.classList.add("is-on");
      };

      const onMove = (event: MouseEvent) => {
        if (!view.editable) return hide();
        const found = blockAt(view, event.clientX, event.clientY);
        if (!found) return hide();
        target = found;
        place(found);
      };

      /* Leaving the editor hides it — but NOT when the pointer has
         merely moved onto the handle itself, which is outside the
         editor's DOM and is the one place it must survive. */
      const onLeave = (event: MouseEvent) => {
        const to = event.relatedTarget;
        if (to instanceof globalThis.Node && handle.contains(to)) return;
        hide();
      };

      const select = () => {
        if (!target) return;
        const { state } = view;
        if (target.pos < 0 || target.pos >= state.doc.content.size) return;
        view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, target.pos)));
        view.focus();
      };

      const onDragStart = (event: DragEvent) => {
        if (!target || !event.dataTransfer) return;
        select();

        const sel = view.state.selection;
        if (!(sel instanceof NodeSelection)) return;

        /* Firefox refuses to start a drag unless SOMETHING is on the
           dataTransfer. The payload is never read: the slice below is
           what ProseMirror actually moves. */
        event.dataTransfer.clearData();
        event.dataTransfer.setData("text/plain", "");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setDragImage(target.dom, 0, 0);

        view.dragging = { slice: sel.content(), move: true };
      };

      const onDragEnd = () => {
        view.dragging = null;
        hide();
      };

      view.dom.addEventListener("mousemove", onMove);
      view.dom.addEventListener("mouseleave", onLeave);
      handle.addEventListener("dragstart", onDragStart);
      handle.addEventListener("dragend", onDragEnd);
      handle.addEventListener("click", select);
      // The handle is parked in viewport coordinates, so anything that
      // scrolls invalidates it. Cheaper to hide than to chase.
      window.addEventListener("scroll", hide, true);

      return {
        update() {
          // A document change can delete or resize the block the handle
          // is parked beside. The next mousemove re-finds it.
          if (target) hide();
        },
        destroy() {
          view.dom.removeEventListener("mousemove", onMove);
          view.dom.removeEventListener("mouseleave", onLeave);
          window.removeEventListener("scroll", hide, true);
          handle.remove();
        },
      };
    },
  });
}

export const BrsDragHandle = Extension.create({
  name: "brsDragHandle",
  addProseMirrorPlugins() {
    return [handlePlugin()];
  },
});
