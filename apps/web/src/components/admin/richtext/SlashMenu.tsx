"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * TYPE "/" AND GET THE BLOCKS.
 *
 * ── WHY THIS EXISTS ──
 * The toolbar has twenty-two controls and an Insert menu. That is the
 * ceiling: every block added after the columns row had to go into a
 * dropdown, because a bar with thirty buttons is a bar nobody scans —
 * they hunt. A slash menu is the other half of the pair. The toolbar is
 * how somebody FINDS a block they did not know about; this is how
 * somebody who already knows reaches it without leaving the keyboard.
 *
 * ── WHY IT IS HAND-ROLLED ──
 * @tiptap/suggestion is not installed and is not worth installing for
 * this. It exists to solve the hard version of the problem — a mention
 * menu that fires mid-sentence, tracks a range through concurrent
 * edits, and survives collaborative cursors. None of that applies: the
 * trigger below is a slash at the START of an empty block, in a
 * single-author editor, and the whole state is three fields.
 *
 * ── WHY THE SLASH ONLY COUNTS AT THE START OF A BLOCK ──
 * Because "and/or" is a thing people write. Firing mid-word means a
 * menu popping up inside ordinary prose, which is the behaviour every
 * editor that does this gets complained about for. At the start of an
 * empty block there is no sentence to interrupt, and a writer who
 * wanted a literal slash there gets it back by pressing Escape or by
 * simply typing on — the menu closes as soon as nothing matches.
 *
 * ── WHY THE KEY HANDLER IS A CAPTURING DOM LISTENER ──
 * ProseMirror binds its own keymap on the editable element. Arrow keys
 * move the caret and Enter splits the block, and both must NOT happen
 * while the menu owns them. A capturing listener on the same element
 * runs first and can stop the event before ProseMirror's handler sees
 * it; a React onKeyDown on an ancestor runs after, which is too late.
 * ══════════════════════════════════════════════════════════════════════
 */

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  emptyDetails,
  emptyGrid,
  emptySection,
  emptyTable,
} from "./extensions";

type Range = { from: number; to: number };

type Item = {
  id: string;
  label: string;
  /** What it is, in the width of a menu row. */
  hint: string;
  /** Extra words this row should match on. The label is searched too. */
  keywords: string;
  apply: (editor: Editor, range: Range) => void;
};

/** Every block reachable from the menu, in the order somebody building
 *  an event page reaches for them — writing first, then the page
 *  furniture, then the things that are neither. */
const ITEMS = (dialogs: {
  link: () => void;
  image: () => void;
  video: () => void;
  pdf: () => void;
  button: () => void;
}): Item[] => {
  /** Replace the "/query" with a block, in one undoable step. */
  const insert = (content: unknown) => (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).insertContent(content as never).run();
  };
  /** Clear the "/query" and hand over to a dialog. */
  const ask = (open: () => void) => (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).run();
    open();
  };
  const setBlock = (name: string, attrs?: Record<string, unknown>) => (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).setNode(name, attrs).run();
  };

  return [
    {
      id: "h2",
      label: "Heading",
      hint: "Section title",
      keywords: "h2 title big",
      apply: setBlock("heading", { level: 2 }),
    },
    {
      id: "h3",
      label: "Subheading",
      hint: "Below a heading",
      keywords: "h3 sub",
      apply: setBlock("heading", { level: 3 }),
    },
    {
      id: "h4",
      label: "Small heading",
      hint: "A label above a line",
      keywords: "h4 minor small",
      apply: setBlock("heading", { level: 4 }),
    },
    {
      id: "ul",
      label: "Bulleted list",
      hint: "Points, unordered",
      keywords: "bullet dot list ul",
      apply: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      id: "ol",
      label: "Numbered list",
      hint: "Steps, in order",
      keywords: "number ordered list ol steps",
      apply: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      id: "quote",
      label: "Quote",
      hint: "Somebody's words",
      keywords: "blockquote pull",
      apply: (editor, range) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").wrapIn("blockquote").run();
      },
    },
    {
      id: "button",
      label: "Button",
      hint: "Register now, read the rules",
      keywords: "cta call action register link",
      apply: ask(dialogs.button),
    },
    {
      id: "callout",
      label: "Callout box",
      hint: "A notice nobody should miss",
      keywords: "note warning deadline info alert",
      apply: insert({ type: "brsCallout", content: [{ type: "paragraph" }] }),
    },
    {
      id: "details",
      label: "Collapsible section",
      hint: "Rules, FAQs — folded away",
      keywords: "accordion faq details toggle expand rules",
      apply: insert(emptyDetails()),
    },
    {
      id: "table",
      label: "Table",
      hint: "Rows and columns",
      keywords: "grid prize schedule rows",
      apply: insert(emptyTable()),
    },
    {
      id: "band",
      label: "Full-width band",
      hint: "A field of colour across the page",
      keywords: "section hero banner background full bleed",
      apply: insert(emptySection()),
    },
    {
      id: "grid",
      label: "Layout area",
      hint: "Drag boxes onto a grid",
      keywords: "grid drag place move position layout arrange snap boxes free canvas hero poster banner anywhere",
      apply: insert(emptyGrid()),
    },
    {
      id: "image",
      label: "Picture",
      hint: "From the library, or upload",
      keywords: "photo photograph image upload",
      apply: ask(dialogs.image),
    },
    {
      id: "video",
      label: "Video",
      hint: "YouTube or Vimeo",
      keywords: "youtube vimeo embed watch",
      apply: ask(dialogs.video),
    },
    {
      id: "pdf",
      label: "PDF",
      hint: "A document, shown whole",
      keywords: "pdf document rulebook brief schedule attachment",
      apply: ask(dialogs.pdf),
    },
    {
      id: "link",
      label: "Link",
      hint: "Words that go somewhere",
      keywords: "url href anchor",
      apply: ask(dialogs.link),
    },
    {
      id: "hr",
      label: "Divider",
      hint: "A line across the column",
      keywords: "rule horizontal line separator hr",
      apply: (editor, range) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      id: "spacer",
      label: "Blank space",
      hint: "A deliberate gap",
      keywords: "gap space spacer padding air",
      apply: insert({ type: "brsSpacer" }),
    },
  ];
};

type MenuState = { range: Range; query: string; at: { left: number; top: number; bottom: number } } | null;

export function SlashMenu({
  editor,
  onAddLink,
  onAddImage,
  onAddVideo,
  onAddPdf,
  onAddButton,
}: {
  editor: Editor;
  onAddLink: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddPdf: () => void;
  onAddButton: () => void;
}) {
  const [menu, setMenu] = useState<MenuState>(null);
  const [active, setActive] = useState(0);

  const all = ITEMS({
    link: onAddLink,
    image: onAddImage,
    video: onAddVideo,
    pdf: onAddPdf,
    button: onAddButton,
  });

  const query = menu?.query.toLowerCase() ?? "";
  const shown = query
    ? all.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(query))
    : all;

  /* The key handler below runs outside React's render, so it reads the
     live values from here rather than from a closure that was correct
     one keystroke ago. */
  const live = useRef({ menu, shown, active });
  live.current = { menu, shown, active };

  /**
   * Is the caret sitting just after a "/…" at the start of a text block?
   *
   * Recomputed on every transaction rather than tracked as a range,
   * which is what makes it correct after an undo, after a click
   * somewhere else, and after a paste — none of which a tracked range
   * survives without mapping it through every step.
   */
  const recompute = useCallback(() => {
    const { state } = editor;
    const sel = state.selection;
    if (!sel.empty || !editor.isEditable) return setMenu(null);

    const $from = state.doc.resolve(sel.from);
    // Only a plain text block. A slash typed into a table cell or a
    // card is still the start of a paragraph, so those work; a slash
    // inside a code mark or on a node selection is not.
    if (!$from.parent.isTextblock) return setMenu(null);

    const start = $from.start();
    const typed = state.doc.textBetween(start, sel.from, "\n", "\n");
    // The slash owns the block from its first character, and the query
    // is letters, numbers and spaces only — so a writer who types a
    // slash and then a bracket has simply written a slash.
    const m = /^\/([\p{L}\p{N} ]{0,24})$/u.exec(typed);
    if (!m) return setMenu(null);

    const coords = editor.view.coordsAtPos(sel.from);
    setMenu({
      range: { from: start, to: sel.from },
      query: m[1] ?? "",
      at: { left: coords.left, top: coords.top, bottom: coords.bottom },
    });
  }, [editor]);

  useEffect(() => {
    recompute();
    editor.on("transaction", recompute);
    editor.on("focus", recompute);
    return () => {
      editor.off("transaction", recompute);
      editor.off("focus", recompute);
    };
  }, [editor, recompute]);

  // A changed query is a changed list; keeping the old index would put
  // the highlight on whatever happens to be in that slot now.
  useEffect(() => setActive(0), [query]);

  const choose = useCallback(
    (item: Item) => {
      const current = live.current.menu;
      if (!current) return;
      setMenu(null);
      item.apply(editor, current.range);
    },
    [editor],
  );

  /* CAPTURING, on the editable element itself — see the note at the top
     of this file. Anything the menu does not claim falls straight
     through to ProseMirror, including every ordinary character, so
     typing continues to narrow the list. */
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      const { menu: open, shown: list, active: i } = live.current;
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMenu(null);
        return;
      }
      if (!list.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActive((n) => (n + 1) % list.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActive((n) => (n - 1 + list.length) % list.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const item = list[i];
        if (item) choose(item);
      }
    };
    dom.addEventListener("keydown", onKey, true);
    return () => dom.removeEventListener("keydown", onKey, true);
  }, [editor, choose]);

  if (!menu || !shown.length) return null;

  /* FIXED, from the caret's own viewport coordinates. The editor sits
     inside a scrolling admin shell and a sticky toolbar, so an
     absolutely-positioned menu would be clipped by one and offset by
     the other. Flipped above the line when there is no room below,
     which on a long write-up is most of the time. */
  const below = window.innerHeight - menu.at.bottom > 280;
  const style: React.CSSProperties = below
    ? { left: menu.at.left, top: menu.at.bottom + 6 }
    : { left: menu.at.left, bottom: window.innerHeight - menu.at.top + 6 };

  return (
    <div
      role="listbox"
      aria-label="Insert a block"
      /* No box-shadow: elevation on this project is a raised surface
         plus a hairline, never a drop shadow (§5.1 rule 4). */
      className="adm-slash fixed z-50 max-h-72 w-72 overflow-y-auto border border-line-strong bg-bg-raised py-1"
      style={style}
      // The caret must not leave the document: a blur here would close
      // the menu before the click that opened it lands.
      onMouseDown={(e) => e.preventDefault()}
    >
      {shown.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseEnter={() => setActive(i)}
          onClick={() => choose(item)}
          className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
            i === active ? "bg-bg-base text-text-primary" : "text-text-secondary"
          }`}
        >
          <span className="text-body-s">{item.label}</span>
          <span className="text-micro uppercase text-text-tertiary">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
