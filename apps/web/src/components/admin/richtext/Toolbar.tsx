"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE TOOLBAR.
 *
 * Every control here maps to something lib/richtext/render.ts can
 * publish. That rule is the same one the old execCommand toolbar was
 * built on and it is the reason this one is longer rather than shorter:
 * the renderer gained fonts, sizes, colours, alignment, pictures and
 * video, so the toolbar may offer them. Nothing is decorative, and
 * nothing here can produce a document the published page will silently
 * drop.
 *
 * ── STATE COMES FROM useEditorState, NOT FROM RE-RENDERING ──
 * Tiptap v3 deliberately stopped re-rendering React on every transaction
 * — in a long article that was a full toolbar reconcile per keystroke.
 * The consequence is that reading `editor.isActive(…)` during render
 * gives you whatever was true at the last unrelated re-render, so the B
 * button lights up a word late. `useEditorState` subscribes to exactly
 * the flags below and re-renders when one of them changes.
 * ══════════════════════════════════════════════════════════════════════
 */

import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import {
  RICH_FONTS,
  RICH_INKS,
  RICH_LEADS,
  RICH_MARKS,
  RICH_SIZES,
  RICH_SIZE_DEFAULT,
  richLead,
} from "@/lib/richtext/palette";

/* ── Icons ────────────────────────────────────────────────────────────
 * Drawn, not typed, for the reason the previous editor gave and which
 * has not stopped being true: a unicode glyph resolves to a different
 * font, weight and baseline on every machine, and a toolbar whose
 * buttons are different sizes is not a toolbar. */
const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const PATHS = {
  undo: "M3 8h11a5 5 0 0 1 0 10h-6M3 8l4-4M3 8l4 4",
  redo: "M21 8H10a5 5 0 0 0 0 10h6M21 8l-4-4M21 8l-4 4",
  code: "M9 6l-6 6 6 6M15 6l6 6-6 6",
  link: "M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1",
  unlink: "M10 13a4 4 0 0 0 5 .6M14 11a4 4 0 0 0-5-.6M4 4l16 16",
  ul: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  ol: "M10 6h11M10 12h11M10 18h11M4 5h1v4M3 15a1 1 0 1 1 2 .6L3 19h2",
  alignLeft: "M3 6h18M3 12h12M3 18h16",
  alignCenter: "M3 6h18M6 12h12M5 18h14",
  alignRight: "M3 6h18M9 12h12M7 18h14",
  alignJustify: "M3 6h18M3 12h18M3 18h18",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 5 5M8.5 9.5h.01",
  video: "M4 5h16v14H4zM10 9l5 3-5 3z",
  hr: "M3 12h18",
  clear: "M4 7h16M9 7l1 12M15 7l-1 12M5 4l14 14",
  /* The two colour controls. An "A" for the letterform whose colour is
     being set, and a marker for the thing you paint over it — the pair
     every editor uses, so neither needs a label. Drawn rather than set
     as glyphs for the reason at the top of this file. */
  letterA: "M4 19L11 5h2l7 14M7.2 14.5h9.6",
  marker: "M4.5 19.5h6M14.5 3.9l5.6 5.6-8 8-5.6-5.6zM9.6 18.1l-3.1-3.1",
} as const;

/* ── Buttons ──────────────────────────────────────────────────────── */

function Tool({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // onMouseDown with preventDefault, not onClick: clicking a button
      // blurs the editor and collapses the selection before the command
      // can act on it.
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      className={`min-w-8 border px-2 py-1 text-body-s transition-colors disabled:opacity-40 ${
        active
          ? "border-accent bg-bg-base text-text-primary"
          : "border-transparent text-text-secondary hover:border-line-hairline hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

const Gap = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-hairline" />;

/* ── Colour ───────────────────────────────────────────────────────────
 *
 * TWO KINDS OF COLOUR, AND THE DIFFERENCE IS NOT COSMETIC.
 *
 * The top row is the six NAMED inks. They resolve through design tokens,
 * which means they follow an inverted field, they have measured contrast
 * ratios, and they will follow the site if it is ever restyled. They are
 * first and they are the ones an editor should reach for.
 *
 * Below that is ANY COLOUR AT ALL, because the club asked for it and it
 * is a reasonable thing to want. That half stores an exact hex and
 * publishes as an inline declaration. It cannot follow a theme — a
 * colour chosen by eye is a statement about THAT colour — so it is
 * second, and the panel says so in one line rather than in a warning.
 *
 * `<input type="color">` is the native picker: the full spectrum, hex
 * entry, recent colours, and on Chrome and Safari an eyedropper that
 * lifts a colour from anywhere on screen. Building that by hand would be
 * several hundred lines and worse.
 */
const HEX = /^#[0-9a-f]{6}$/i;

function ColourControl({
  label,
  title,
  options,
  varPrefix,
  current,
  pending,
  onPick,
  onClear,
}: {
  label: React.ReactNode;
  title: string;
  options: { id: string; label: string }[];
  varPrefix: string;
  /** A token id, a #rrggbb, or null. */
  current: string | null;
  /** True when the colour is queued for the next keystroke rather than
   *  applied to text that exists. */
  pending?: boolean;
  onPick: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const isExact = !!current && HEX.test(current);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const swatchOf = (value: string) => (HEX.test(value) ? value : `var(--${varPrefix}-${value})`);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        title={
          pending && current
            ? `${title} — ready for what you type next`
            : title
        }
        aria-label={title}
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className={`flex min-w-8 flex-col items-center gap-0.5 border px-2 py-1 text-body-s transition-colors ${
          current
            ? "border-accent text-text-primary"
            : "border-transparent text-text-secondary hover:border-line-hairline hover:text-text-primary"
        }`}
      >
        {label}
        {/* The bar sits UNDER the glyph, which is the shape of this
            control everywhere it exists — the icon says what is being
            coloured, the bar says what colour it currently is. Unset
            shows the hairline alone rather than an empty gap, so the
            button does not change height when a colour is chosen. */}
        <span
          aria-hidden="true"
          // Dashed while the colour is only queued, solid once it is on
          // real text. Same swatch, two states, no extra chrome.
          className={`block h-1 w-4 border ${
            pending && current ? "border-dashed border-accent" : "border-line-hairline"
          }`}
          style={{ background: current ? swatchOf(current) : "transparent" }}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 border border-line-strong bg-bg-raised p-3">
          <p className="mb-2 font-mono text-micro uppercase text-text-tertiary">Colours</p>
          <ul className="grid grid-cols-6 gap-1">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  title={o.label}
                  aria-label={o.label}
                  aria-pressed={current === o.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(o.id);
                    setOpen(false);
                  }}
                  className={`block h-7 w-full border-2 transition-colors ${
                    current === o.id
                      ? "border-accent"
                      : "border-line-hairline hover:border-line-strong"
                  }`}
                  style={{ background: swatchOf(o.id) }}
                />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            {/* Not onMouseDown-prevented: the native picker needs the
                real click. The editor's selection survives losing focus
                to it, and onPick refocuses. */}
            <input
              type="color"
              aria-label={`${title} — pick any colour`}
              value={isExact ? current : "#7b1223"}
              onChange={(e) => onPick(e.target.value.toLowerCase())}
              className="h-8 w-12 cursor-pointer border border-line-hairline bg-bg-base p-0.5"
            />
            <input
              type="text"
              aria-label={`${title} — hex code`}
              defaultValue={isExact ? current : ""}
              placeholder="#7b1223"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (HEX.test(v)) {
                  onPick(v.toLowerCase());
                  setOpen(false);
                }
              }}
              className="adm-input min-w-0 flex-1 py-1 font-mono text-body-s"
            />
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClear();
              setOpen(false);
            }}
            className="mt-3 w-full border border-line-hairline px-2 py-1 text-micro uppercase text-text-secondary transition-colors hover:border-line-strong hover:text-text-primary"
          >
            Remove colour
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ── The bar ──────────────────────────────────────────────────────── */

export function Toolbar({
  editor,
  onAddLink,
  onAddImage,
  onAddVideo,
}: {
  editor: Editor;
  onAddLink: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const style = e.getAttributes("brsStyle") as Record<string, unknown>;
      const sel = e.state.selection;
      const isImageSelected =
        sel instanceof NodeSelection && sel.node.type.name === "brsImage";
      const imageAlign =
        sel instanceof NodeSelection && sel.node.type.name === "brsImage"
          ? ((sel.node.attrs.align as string) || "center")
          : null;

      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        link: e.isActive("link"),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        isImageSelected,
        alignLeft: isImageSelected ? imageAlign === "left" : e.isActive({ textAlign: "left" }),
        alignCenter: isImageSelected ? imageAlign === "center" : e.isActive({ textAlign: "center" }),
        alignRight: isImageSelected ? imageAlign === "right" : e.isActive({ textAlign: "right" }),
        alignJustify: isImageSelected ? false : e.isActive({ textAlign: "justify" }),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        /* The line spacing of the block the cursor is in. Read from
           whichever of the two types is active, because the attribute
           lives on the block rather than on a mark. */
        lead:
          richLead(e.getAttributes("paragraph").lead) ??
          richLead(e.getAttributes("heading").lead),
        font: typeof style.font === "string" ? style.font : "body",
        size: typeof style.size === "number" ? style.size : RICH_SIZE_DEFAULT,
        ink: typeof style.ink === "string" ? style.ink : null,
        mark: typeof style.mark === "string" ? style.mark : null,
        /* Whether that colour is waiting to be typed rather than sitting
           on text. getAttributes already folds storedMarks in, so the
           swatch shows either way — but the two states need to LOOK
           different, or choosing a colour with no selection reads as the
           button having failed. */
        pending: e.state.selection.empty && !!e.state.storedMarks?.length,
      };
    },
  });

  if (!s) return null;

  const chain = () => editor.chain().focus();

  /**
   * Set one attribute of the single style mark, leaving the other three
   * alone — setMark merges into a mark already on the range.
   *
   * ── THIS DOES EXACTLY TWO THINGS, AND NEVER GUESSES BETWEEN THEM ──
   *
   *   text selected   colour the selection
   *   no selection    colour what gets typed next (a "stored mark")
   *
   * An earlier version widened an empty selection to the word under the
   * cursor, on the theory that clicking a colour should always do
   * something you can see. That was wrong, and it produced the exact
   * complaint you would predict: putting the cursor after a word to set
   * a colour for the NEXT word silently recoloured the PREVIOUS one.
   *
   * Guessing which of two intentions the editor meant is the whole
   * mistake. A control that sometimes edits text you did not select is
   * worse than one that occasionally looks like it did nothing — and it
   * no longer looks like nothing, because the toolbar shows a pending
   * colour (see `pending` in the selector above).
   *
   * A consequence worth knowing rather than working around: clicking
   * into the text after choosing a colour discards it, because moving
   * the cursor clears stored marks. That is ProseMirror behaving as
   * every editor does — put the cursor where you want it FIRST, then
   * choose the colour, then type.
   */
  const style = (attrs: Record<string, unknown>) =>
    chain().setMark("brsStyle", attrs).run();

  const block = s.h2 ? "h2" : s.h3 ? "h3" : s.blockquote ? "quote" : "p";

  const setBlock = (value: string) => {
    const c = chain();
    // Leaving a quote is a separate act from becoming a heading, so the
    // quote is always lifted first and re-applied only if asked for.
    if (s.blockquote && value !== "quote") c.lift("blockquote");
    if (value === "h2") c.setNode("heading", { level: 2 });
    else if (value === "h3") c.setNode("heading", { level: 3 });
    else if (value === "quote") c.setNode("paragraph").wrapIn("blockquote");
    else c.setNode("paragraph");
    c.run();
  };

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      /* STICKY, so the controls are still there on the second screenful
         of a long write-up. Scrolling to the top of the page to press B
         and then scrolling back is the thing that makes an editor feel
         like a form field.

         top-16 is the height of the admin header, which is sticky at 0
         and paints at z-40 — a couple of pixels of overlap tuck under an
         opaque bar rather than showing a seam. Not below md: the header
         wraps to two rows on a narrow screen, and a bar pinned at 64px
         would sit on top of it. */
      className="z-20 flex flex-wrap items-center gap-1 border-b border-line-hairline bg-bg-raised px-2 py-2 md:sticky md:top-16"
    >
      <Tool title="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <Icon d={PATHS.undo} />
      </Tool>
      <Tool title="Redo (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <Icon d={PATHS.redo} />
      </Tool>

      <Gap />

      {/* Mutually exclusive — this is what the text IS, not three things
          it can be — so a select rather than three buttons. */}
      <select
        aria-label="Paragraph style"
        value={block}
        onChange={(e) => setBlock(e.target.value)}
        className="adm-input w-auto py-1 text-body-s"
      >
        <option value="p">Normal text</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
        <option value="quote">Quote</option>
      </select>

      <select
        aria-label="Font"
        value={s.font}
        onChange={(e) => style({ font: e.target.value === "body" ? null : e.target.value })}
        className="adm-input w-auto py-1 text-body-s"
      >
        {RICH_FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      {/* The brief asked for the size "showing as number", so it is the
          number and nothing else — not "Small / Normal / Large", which
          is the thing you cannot reason about when matching two
          paragraphs written a month apart. */}
      <select
        aria-label="Font size"
        title="Font size"
        value={s.size}
        onChange={(e) => {
          const n = Number(e.target.value);
          style({ size: n === RICH_SIZE_DEFAULT ? null : n });
        }}
        className="adm-input w-auto py-1 text-body-s"
      >
        {RICH_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <Gap />

      <Tool title="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <span style={{ fontVariationSettings: "'wght' 700" }}>B</span>
      </Tool>
      <Tool title="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <span style={{ fontStyle: "italic" }}>I</span>
      </Tool>
      <Tool
        title="Underline (Ctrl+U)"
        active={s.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <span style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>U</span>
      </Tool>
      <Tool title="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <span style={{ textDecoration: "line-through" }}>S</span>
      </Tool>
      <Tool title="Code" active={s.code} onClick={() => chain().toggleCode().run()}>
        <Icon d={PATHS.code} />
      </Tool>

      <Gap />

      <ColourControl
        title="Text colour"
        label={<Icon d={PATHS.letterA} />}
        options={RICH_INKS}
        varPrefix="rt-ink"
        current={s.ink}
        pending={s.pending}
        onPick={(value) => style({ ink: value })}
        onClear={() => style({ ink: null })}
      />
      <ColourControl
        title="Highlight colour"
        label={<Icon d={PATHS.marker} />}
        options={RICH_MARKS}
        varPrefix="rt-mark"
        current={s.mark}
        pending={s.pending}
        onPick={(value) => style({ mark: value })}
        onClear={() => style({ mark: null })}
      />

      <Gap />

      <Tool title="Add a link (Ctrl+K)" active={s.link} onClick={onAddLink}>
        <Icon d={PATHS.link} />
      </Tool>
      <Tool
        title="Remove the link"
        disabled={!s.link}
        onClick={() => chain().unsetLink().run()}
      >
        <Icon d={PATHS.unlink} />
      </Tool>

      <Gap />

      <Tool
        title="Align left"
        active={s.alignLeft}
        onClick={() => {
          if (s.isImageSelected) {
            editor.commands.updateAttributes("brsImage", { align: "left" });
          } else {
            chain().setTextAlign("left").run();
          }
        }}
      >
        <Icon d={PATHS.alignLeft} />
      </Tool>
      <Tool
        title="Align centre"
        active={s.alignCenter}
        onClick={() => {
          if (s.isImageSelected) {
            editor.commands.updateAttributes("brsImage", { align: "center" });
          } else {
            chain().setTextAlign("center").run();
          }
        }}
      >
        <Icon d={PATHS.alignCenter} />
      </Tool>
      <Tool
        title="Align right"
        active={s.alignRight}
        onClick={() => {
          if (s.isImageSelected) {
            editor.commands.updateAttributes("brsImage", { align: "right" });
          } else {
            chain().setTextAlign("right").run();
          }
        }}
      >
        <Icon d={PATHS.alignRight} />
      </Tool>
      <Tool
        title="Justify"
        active={s.alignJustify}
        disabled={s.isImageSelected}
        onClick={() => chain().setTextAlign("justify").run()}
      >
        <Icon d={PATHS.alignJustify} />
      </Tool>

      {/* THE GAP BETWEEN THE LINES, per paragraph.
          A select rather than buttons for the same reason the paragraph
          style is one: a block has exactly one line spacing, and four
          toggles that are secretly a radio group is the control people
          press twice. The numbers are the ones every word processor
          shows, and "Single" is the site's own leading rather than 1.0
          — see RICH_LEADS. */}
      <select
        aria-label="Line spacing"
        title="Line spacing"
        value={s.lead === null ? "single" : String(s.lead)}
        onChange={(e) => {
          const v = e.target.value;
          const lead = v === "single" ? null : Number(v);
          // Both types, one transaction. A selection spanning a heading
          // and two paragraphs sets all three; the type that is not in
          // the selection is a no-op rather than an error.
          chain()
            .updateAttributes("paragraph", { lead })
            .updateAttributes("heading", { lead })
            .run();
        }}
        className="adm-input w-auto py-1 text-body-s"
      >
        {RICH_LEADS.map((l) => (
          <option key={l.id} value={l.value === null ? "single" : String(l.value)}>
            Spacing: {l.label}
          </option>
        ))}
      </select>

      <Gap />

      <Tool
        title="Bulleted list"
        active={s.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <Icon d={PATHS.ul} />
      </Tool>
      <Tool
        title="Numbered list"
        active={s.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <Icon d={PATHS.ol} />
      </Tool>

      <Gap />

      <Tool title="Add a picture" onClick={onAddImage}>
        <Icon d={PATHS.image} />
      </Tool>
      {/* Next to the picture, because they are the same act — putting
          something into the writing that is not writing. */}
      <Tool title="Add a video" onClick={onAddVideo}>
        <Icon d={PATHS.video} />
      </Tool>
      <Tool title="Horizontal line" onClick={() => chain().setHorizontalRule().run()}>
        <Icon d={PATHS.hr} />
      </Tool>

      <Gap />

      <Tool
        title="Clear formatting"
        onClick={() => chain().unsetAllMarks().unsetTextAlign().run()}
      >
        <Icon d={PATHS.clear} />
      </Tool>
    </div>
  );
}
