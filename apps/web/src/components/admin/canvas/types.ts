/**
 * THE PAGE MODEL — the actual product, per the project vision doc §7.
 *
 * Everything else (the editor UI, the eventual animation/interaction
 * runtime, the public renderer) is built AGAINST this shape, not the
 * other way around. Nothing here is HTML or CSS — an element is a
 * plain data description of what it is and where it sits; turning that
 * into markup is the renderer's job, which does not exist yet in this
 * milestone. Keeping that boundary from the very first element type is
 * the point: it is the one decision that is expensive to retrofit
 * later and free to get right now.
 *
 * MILESTONE SCOPE: this first pass has two element types (text, image),
 * position and size, and nothing else — no animations, no interactions,
 * no z-order beyond array order. Those are later, deliberate additions
 * to this same shape, not a rewrite of it. See CanvasEditor.tsx's file
 * comment for what's intentionally NOT here yet.
 */

export type CanvasElementBase = {
  id: string;
  /** Pixels, relative to the canvas/page origin (top-left). Not a
   *  percentage — unlike the flowing write-up editor, a canvas element's
   *  position is not relative to a column that reflows; it is a fixed
   *  point on a fixed-size page, the same way a slide in a slide deck
   *  is a fixed size regardless of the window it is edited in. */
  x: number;
  y: number;
  width: number;
  height: number;

  /** ── Shared appearance, per §2 of the vision doc: "change
   *  backgrounds", "change borders/radius", "adjust opacity". On the
   *  base type rather than duplicated per element type, since a
   *  background/border/radius/opacity means the same thing regardless
   *  of what's inside the box — text, an image, or a plain shape. */
  backgroundColor: string | null;
  borderColor: string | null;
  borderWidth: number;
  borderRadius: number;
  /** 0–100, not 0–1 — a percent is what a non-technical person reading
   *  a slider actually thinks in; the renderer divides by 100. */
  opacity: number;
};

export type TextCanvasElement = CanvasElementBase & {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  /** One of the site's three real families — see globals.css's @theme
   *  block for the actual font stacks these key into. Not a free-text
   *  font picker: the whole point of building this on the write-up
   *  editor's own design tokens is that nothing typed here can produce
   *  a page that looks unlike the rest of the site. */
  fontFamily: "sans" | "mono" | "editorial";
  bold: boolean;
  italic: boolean;
  /** When true (the default), text that no longer fits the box's fixed
   *  height shrinks its own displayed size until it does — see
   *  CanvasEditor's useAutoFit. A box is a fixed size, like a text box
   *  in a slide deck, not a column that grows with its content; this
   *  is what makes that tolerable to type into. Worth turning off for
   *  a long-form body a reader is meant to scroll, where shrinking
   *  four paragraphs down to 6px is worse than just letting the box
   *  scroll — which is why it's a per-element toggle, not global. */
  autoFit: boolean;
};

export type ImageCanvasElement = CanvasElementBase & {
  type: "image";
  /** A raw URL for this milestone. A later pass swaps this for the
   *  asset-library id the write-up editor's PhotoPicker already uses,
   *  the same way BrsImage stores an assetId rather than a URL — this
   *  prototype is deliberately not wired to that yet, see the file
   *  comment on CanvasEditor.tsx. */
  src: string;
  alt: string;
};

/**
 * THE THIRD ELEMENT TYPE FROM §2 OF THE VISION DOC. Deliberately just a
 * styled rectangle or ellipse for this pass — no per-shape library of
 * icons or polygons, since backgroundColor/border/radius on the shared
 * base above already cover "a rounded rectangle" and "a circle", which
 * is most of what a shape is actually used for on an event page (a
 * colored panel behind text, a decorative dot, a divider bar).
 */
export type ShapeCanvasElement = CanvasElementBase & {
  type: "shape";
  shape: "rectangle" | "ellipse";
};

export type CanvasElement = TextCanvasElement | ImageCanvasElement | ShapeCanvasElement;

export type CanvasPage = {
  width: number;
  height: number;
  elements: CanvasElement[];
};

export const CANVAS_PAGE_WIDTH = 1200;
export const CANVAS_PAGE_HEIGHT = 1100;

export const MIN_ELEMENT_SIZE = 24;

let n = 0;
/** Not a uuid — this never leaves the browser tab in this milestone
 *  (nothing is saved yet), so a counter is enough and is trivially
 *  deterministic to read while debugging. */
export function newElementId(prefix: string): string {
  n += 1;
  return `${prefix}-${n}`;
}

/** Shared defaults every new element starts with — fully transparent,
 *  no border, full opacity, so a freshly added element looks like
 *  "nothing yet" rather than announcing itself with an accidental
 *  color choice. */
function baseDefaults() {
  return {
    backgroundColor: null,
    borderColor: null,
    borderWidth: 0,
    borderRadius: 0,
    opacity: 100,
  };
}

export function defaultTextElement(x: number, y: number): TextCanvasElement {
  return {
    id: newElementId("text"),
    type: "text",
    x,
    y,
    width: 320,
    height: 64,
    text: "Double-click to edit this text",
    fontSize: 24,
    color: "#141414",
    align: "left",
    fontFamily: "sans",
    bold: false,
    italic: false,
    autoFit: true,
    ...baseDefaults(),
  };
}

export function defaultImageElement(x: number, y: number): ImageCanvasElement {
  return {
    id: newElementId("image"),
    type: "image",
    x,
    y,
    width: 320,
    height: 200,
    src: "",
    alt: "",
    ...baseDefaults(),
  };
}

export function defaultShapeElement(x: number, y: number): ShapeCanvasElement {
  return {
    id: newElementId("shape"),
    type: "shape",
    x,
    y,
    width: 200,
    height: 120,
    shape: "rectangle",
    // A shape with no fill is invisible, unlike text or an image which
    // still show something (a placeholder, a caret) — so this one
    // default breaks the "nothing yet" rule above on purpose.
    backgroundColor: "#e3e8ea",
    borderColor: null,
    borderWidth: 0,
    borderRadius: 0,
    opacity: 100,
  };
}

/**
 * A STARTING POINT SHAPED LIKE THE REAL EVENT EDITOR, not a from-scratch
 * blog post. Title, cover, body — the same three things the write-up
 * editor's event form asks for (see apps/web/src/app/admin/events/edit/
 * page.tsx), reproduced here as canvas elements at sizes that read as
 * an actual article the moment they land, not an empty page with three
 * random boxes on it.
 *
 * Deliberately NOT wired to any real event yet — this seeds fresh,
 * disconnected elements. Loading an existing event's title/cover/body
 * into these slots is exactly the kind of thing a later, save/load
 * milestone does; this one is about the shapes being right first.
 */
export function blogPostTemplate(pageWidth: number): CanvasElement[] {
  const margin = 80;
  const contentWidth = pageWidth - margin * 2;
  return [
    {
      id: newElementId("text"),
      type: "text",
      x: margin,
      y: 64,
      width: contentWidth,
      height: 96,
      text: "Event title goes here",
      fontSize: 48,
      color: "#141414",
      align: "left",
      fontFamily: "editorial",
      bold: false,
      italic: false,
      autoFit: true,
      ...baseDefaults(),
    },
    {
      id: newElementId("image"),
      type: "image",
      x: margin,
      y: 176,
      width: contentWidth,
      height: 320,
      src: "",
      alt: "Cover photograph",
      ...baseDefaults(),
    },
    {
      id: newElementId("text"),
      type: "text",
      x: margin,
      y: 520,
      width: contentWidth,
      height: 480,
      text: "Write the event's story here. This box does not shrink your text — it's meant to scroll, the way the body of a real article does, so turn Auto-fit off in the panel if it's fighting you.",
      fontSize: 18,
      color: "#141414",
      align: "left",
      fontFamily: "sans",
      bold: false,
      italic: false,
      autoFit: false,
      ...baseDefaults(),
    },
  ];
}
