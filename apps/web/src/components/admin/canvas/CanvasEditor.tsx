"use client";

/**
 * CANVAS EDITOR — MILESTONE 1 PROTOTYPE.
 *
 * Per the project vision doc: a free-form visual page builder (Canva/
 * PowerPoint-like), not the flowing document the RichText editor is.
 * This is the first, deliberately narrow slice, agreed with the person
 * building this: get a bare-bones draggable, resizable canvas working
 * with two element types, before any animation system, interaction
 * system, save/publish pipeline, or asset-library wiring exists.
 *
 * WHAT IS DELIBERATELY NOT HERE YET, so nobody reads its absence as an
 * oversight:
 *   · No save or publish. `elements` is React state; refreshing the
 *     page loses everything. The JSON page model (types.ts) is written
 *     the way it is specifically so a save/load pass later is a
 *     serialization problem, not a redesign.
 *   · No animation or interaction configuration (§3–4 of the vision
 *     doc). Selecting an element shows position/size/content only.
 *   · No real asset library — an image element takes a raw URL typed
 *     into a text field, not the existing PhotoPicker/upload flow the
 *     write-up editor already has. Wiring that in is straightforward
 *     once this milestone is approved; it was left out here so this
 *     component could be reviewed on its own.
 *   · No z-order controls, multi-select, keyboard nudging, undo, or
 *     snapping/alignment guides. All standard next steps, all after
 *     this one is confirmed to feel right.
 *   · No rotation. Position and size only.
 *
 * WHAT IS HERE: click to select, drag the body to move, drag any of
 * eight handles to resize (from ANY corner or edge, each anchoring
 * correctly — unlike the write-up editor's PDF/video resize, which
 * only ever grows from a fixed top-left because those blocks are never
 * repositioned, a canvas element can be resized from its top or left
 * edge too, which has to move x/y at the same time it changes width/
 * height or the opposite corner would appear to drift).
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  blogPostTemplate,
  CANVAS_PAGE_HEIGHT,
  CANVAS_PAGE_WIDTH,
  type CanvasElement,
  defaultImageElement,
  defaultShapeElement,
  defaultTextElement,
  MIN_ELEMENT_SIZE,
  type TextCanvasElement,
} from "./types";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

/** Keys into the site's real three families (see globals.css's @theme
 *  block) — not arbitrary font names, so nothing typed in this editor
 *  can produce type the rest of the site doesn't already use. */
const FONT_STACK: Record<TextCanvasElement["fontFamily"], string> = {
  sans: "var(--font-display)",
  mono: "var(--font-mono)",
  editorial: "var(--font-editorial)",
};

/** How far a box will shrink its own text before giving up and just
 *  letting it clip — a floor, not a target. Below this a caption is no
 *  longer readable, so overflowing is the more honest failure. */
const AUTO_FIT_MIN_FONT = 10;

/**
 * SHRINK-TO-FIT TEXT — the PowerPoint "Shrink text on overflow" idea.
 *
 * The box is a fixed size; the font is not, within a floor. After
 * every change that could affect whether the text fits — the text
 * itself, the box's own size, the requested font size, or a toggle of
 * `autoFit` — this measures the real rendered content against the
 * box's own height using the DOM directly (`scrollHeight` vs
 * `clientHeight`), the same signal a browser already computes for any
 * element; there is no need for canvas text-metrics APIs or a font
 * library to answer "does this fit."
 *
 * STEPS DOWN, NOT A FORMULA: a single computed ratio
 * (boxHeight / scrollHeight) is tempting but wrong here, because
 * shrinking the font changes the line-wrap, which changes how many
 * lines there are, which changes whether the new size still fits — a
 * ratio computed at the ORIGINAL wrap does not account for wrapping
 * getting shorter as the font shrinks. A small stepped loop re-measures
 * after every step and is correct regardless of wrap changes; the
 * range here (48 → 10px) never takes more than roughly a dozen steps,
 * which is not a perceptible delay.
 */
function AutoFitText({
  el,
  editing,
  onDoubleClick,
  onCommit,
}: {
  el: TextCanvasElement;
  editing: boolean;
  onDoubleClick: (e: React.MouseEvent) => void;
  onCommit: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState(el.fontSize);
  // Mirrors el.text while typing. The parent's copy only updates on
  // blur (see onCommit below) — without this, auto-fit would only ever
  // re-check once you clicked away, which reads as "broken" the moment
  // you watch it while actually typing a long caption.
  const [liveText, setLiveText] = useState(el.text);
  useLayoutEffect(() => {
    if (!editing) setLiveText(el.text);
  }, [el.text, editing]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !el.autoFit) {
      setDisplaySize(el.fontSize);
      return;
    }

    let size = el.fontSize;
    node.style.fontSize = `${size}px`;
    // scrollHeight > clientHeight: the content, at this font size, is
    // taller than the box actually is — the box would clip or the
    // browser would show a scrollbar, neither of which is "fits."
    while (size > AUTO_FIT_MIN_FONT && node.scrollHeight > node.clientHeight) {
      size -= 1;
      node.style.fontSize = `${size}px`;
    }
    setDisplaySize(size);
    // Re-run whenever anything that could change whether it fits
    // changes — including the live text while typing, not just the
    // committed value.
  }, [liveText, el.width, el.height, el.fontSize, el.autoFit, el.bold, el.italic]);

  return (
    <div
      ref={ref}
      className="cv-text"
      style={{
        fontSize: displaySize,
        color: el.color,
        textAlign: el.align,
        fontFamily: FONT_STACK[el.fontFamily],
        fontWeight: el.bold ? 700 : undefined,
        fontStyle: el.italic ? "italic" : undefined,
      }}
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={onDoubleClick}
      onInput={(e) => setLiveText(e.currentTarget.textContent ?? "")}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
    >
      {el.text}
    </div>
  );
}

export function CanvasEditor() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)),
    );
  }, []);

  const addText = () => {
    const el = defaultTextElement(80, 80);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const addImage = () => {
    const el = defaultImageElement(80, 80);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const addShape = () => {
    const el = defaultShapeElement(80, 80);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    // Offset slightly so the copy is visibly a copy, sitting next to
    // the original rather than exactly on top of it where it would
    // look like nothing happened.
    const copy: CanvasElement = {
      ...selected,
      id: `${selected.type}-${Date.now()}-copy`,
      x: Math.min(CANVAS_PAGE_WIDTH - selected.width, selected.x + 24),
      y: Math.min(CANVAS_PAGE_HEIGHT - selected.height, selected.y + 24),
    };
    setElements((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const bringToFront = () => {
    if (!selectedId) return;
    setElements((prev) => {
      const el = prev.find((e) => e.id === selectedId);
      if (!el) return prev;
      return [...prev.filter((e) => e.id !== selectedId), el];
    });
  };

  const sendToBack = () => {
    if (!selectedId) return;
    setElements((prev) => {
      const el = prev.find((e) => e.id === selectedId);
      if (!el) return prev;
      return [el, ...prev.filter((e) => e.id !== selectedId)];
    });
  };

  /** Drag the body of an element to move it. Bounded to the page: an
   *  element cannot be dragged fully off the canvas, since "where did
   *  it go" is a worse experience for a first-time, non-technical user
   *  than a hard edge is. */
  const startMove = (e: React.PointerEvent, id: string, x: number, y: number) => {
    if (editingTextId === id) return; // let text selection/caret work normally
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);

    const startX = e.clientX;
    const startY = e.clientY;
    const el = elements.find((it) => it.id === id);
    if (!el) return;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const nextX = Math.min(Math.max(0, x + dx), CANVAS_PAGE_WIDTH - el.width);
      const nextY = Math.min(Math.max(0, y + dy), CANVAS_PAGE_HEIGHT - el.height);
      updateElement(id, { x: nextX, y: nextY });
    };
    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };

  /**
   * RESIZE FROM ANY OF EIGHT HANDLES, ANCHORED CORRECTLY.
   *
   * A handle on the right/bottom only ever changes width/height. A
   * handle on the left/top has to change x/y at the same rate it
   * changes width/height, in the opposite direction, or the FAR corner
   * (the one the person is not dragging) would visibly slide — which
   * reads as "the box moved", not "the box resized", the moment you
   * drag from the top-left the way any slide-editor handle is expected
   * to work.
   */
  const startResize = (e: React.PointerEvent, id: string, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();

    const el = elements.find((it) => it.id === id);
    if (!el) return;
    const start = { x: el.x, y: el.y, width: el.width, height: el.height };
    const startX = e.clientX;
    const startY = e.clientY;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y, width, height } = start;

      if (handle.includes("e")) {
        width = Math.max(MIN_ELEMENT_SIZE, start.width + dx);
      } else if (handle.includes("w")) {
        const nextWidth = Math.max(MIN_ELEMENT_SIZE, start.width - dx);
        x = start.x + (start.width - nextWidth);
        width = nextWidth;
      }

      if (handle.includes("s")) {
        height = Math.max(MIN_ELEMENT_SIZE, start.height + dy);
      } else if (handle.includes("n")) {
        const nextHeight = Math.max(MIN_ELEMENT_SIZE, start.height - dy);
        y = start.y + (start.height - nextHeight);
        height = nextHeight;
      }

      updateElement(id, { x, y, width, height });
    };
    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };

  return (
    <div className="cv-editor">
      {/* ── ADD ELEMENT ─────────────────────────────────────────────── */}
      <aside className="cv-panel cv-panel-left">
        <h2 className="cv-panel-title">Add</h2>
        <button type="button" className="cv-add-btn" onClick={addText}>
          <span className="cv-add-icon" aria-hidden="true">
            T
          </span>
          Text
        </button>
        <button type="button" className="cv-add-btn" onClick={addImage}>
          <span className="cv-add-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16">
              <rect x="2" y="3" width="16" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="7" cy="8" r="1.6" fill="currentColor" />
              <path d="M3 15l5-5 3 3 3-4 4 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          Image
        </button>
        <button type="button" className="cv-add-btn" onClick={addShape}>
          <span className="cv-add-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16">
              <rect x="2.5" y="4" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="14" cy="14" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          Shape
        </button>

        <hr className="cv-panel-divider" />

        <button
          type="button"
          className="cv-add-btn cv-add-btn-template"
          onClick={() => {
            setElements(blogPostTemplate(CANVAS_PAGE_WIDTH));
            setSelectedId(null);
          }}
        >
          <span className="cv-add-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16">
              <rect x="3" y="2" width="14" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <line x1="5.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.4" />
              <line x1="5.5" y1="9" x2="14.5" y2="9" stroke="currentColor" strokeWidth="1.4" />
              <line x1="5.5" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          Load blog post layout
        </button>
      </aside>

      {/* ── THE PAGE ─────────────────────────────────────────────────── */}
      <div className="cv-stage">
        <div
          ref={canvasRef}
          className="cv-page"
          style={{ width: CANVAS_PAGE_WIDTH, height: CANVAS_PAGE_HEIGHT }}
          onPointerDown={() => {
            setSelectedId(null);
            setEditingTextId(null);
          }}
        >
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            // An ellipse is always fully round regardless of the
            // borderRadius field — that field only means something for
            // a rectangle. Computed here rather than a separate CSS
            // rule keyed on a child element, which would need :has()
            // and be a stranger place to look for "why is this round."
            const effectiveRadius =
              el.type === "shape" && el.shape === "ellipse" ? "50%" : el.borderRadius || undefined;
            return (
              <div
                key={el.id}
                className={`cv-element${isSelected ? " cv-element-selected" : ""}`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  // Shared appearance from §2 of the vision doc — the
                  // same four properties regardless of element type,
                  // applied once here rather than duplicated in each
                  // type's own renderer below.
                  backgroundColor: el.backgroundColor ?? undefined,
                  borderColor: el.borderColor ?? undefined,
                  borderWidth: el.borderWidth || undefined,
                  borderStyle: el.borderWidth ? "solid" : undefined,
                  borderRadius: effectiveRadius,
                  opacity: el.opacity / 100,
                }}
                onPointerDown={(e) => startMove(e, el.id, el.x, el.y)}
              >
                {el.type === "text" ? (
                  <AutoFitText
                    el={el}
                    editing={editingTextId === el.id}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTextId(el.id);
                    }}
                    onCommit={(text) => {
                      setEditingTextId(null);
                      updateElement(el.id, { text });
                    }}
                  />
                ) : el.type === "image" ? (
                  el.src ? (
                    // A raw pasted URL, not an optimizable local asset in this milestone.
                    <img className="cv-image" src={el.src} alt={el.alt} draggable={false} />
                  ) : (
                    <div className="cv-image-empty">No image URL set — see the panel on the right</div>
                  )
                ) : null}

                {isSelected ? (
                  <>
                    {HANDLES.map((h) => (
                      <span
                        key={h}
                        role="presentation"
                        className={`cv-handle cv-h-${h}`}
                        onPointerDown={(e) => startResize(e, el.id, h)}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            );
          })}

          {elements.length === 0 ? (
            <p className="cv-empty">
              Nothing on the page yet. Add a text box or an image from the panel on the left.
            </p>
          ) : null}
        </div>
      </div>

      {/* ── PROPERTIES ──────────────────────────────────────────────── */}
      <aside className="cv-panel cv-panel-right">
        <h2 className="cv-panel-title">Properties</h2>
        {!selected ? (
          <p className="cv-panel-empty">Select something on the page to edit it.</p>
        ) : (
          <div className="cv-props">
            <div className="cv-prop-row">
              <label>
                X
                <input
                  type="number"
                  value={Math.round(selected.x)}
                  onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })}
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  value={Math.round(selected.y)}
                  onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="cv-prop-row">
              <label>
                Width
                <input
                  type="number"
                  value={Math.round(selected.width)}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      width: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value)),
                    })
                  }
                />
              </label>
              <label>
                Height
                <input
                  type="number"
                  value={Math.round(selected.height)}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      height: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value)),
                    })
                  }
                />
              </label>
            </div>

            {selected.type === "text" ? (
              <>
                <label className="cv-prop-full">
                  Text
                  <textarea
                    rows={3}
                    value={selected.text}
                    onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                  />
                </label>
                <div className="cv-prop-row">
                  <label>
                    Font
                    <select
                      value={selected.fontFamily}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          fontFamily: e.target.value as TextCanvasElement["fontFamily"],
                        })
                      }
                    >
                      <option value="sans">Sans (body)</option>
                      <option value="editorial">Editorial (titles)</option>
                      <option value="mono">Mono</option>
                    </select>
                  </label>
                  <label>
                    Font size
                    <input
                      type="number"
                      value={selected.fontSize}
                      onChange={(e) =>
                        updateElement(selected.id, { fontSize: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <div className="cv-prop-row">
                  <label>
                    Color
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                    />
                  </label>
                  <label>
                    Align
                    <select
                      value={selected.align}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          align: e.target.value as "left" | "center" | "right",
                        })
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                </div>
                <div className="cv-prop-row">
                  <button
                    type="button"
                    aria-pressed={selected.bold}
                    className={selected.bold ? "cv-toggle-on" : ""}
                    onClick={() => updateElement(selected.id, { bold: !selected.bold })}
                  >
                    <strong>B</strong> Bold
                  </button>
                  <button
                    type="button"
                    aria-pressed={selected.italic}
                    className={selected.italic ? "cv-toggle-on" : ""}
                    onClick={() => updateElement(selected.id, { italic: !selected.italic })}
                  >
                    <em>I</em> Italic
                  </button>
                </div>
                <label className="cv-prop-checkbox">
                  <input
                    type="checkbox"
                    checked={selected.autoFit}
                    onChange={(e) => updateElement(selected.id, { autoFit: e.target.checked })}
                  />
                  Auto-fit text to box
                </label>
                {selected.autoFit ? (
                  <p className="cv-prop-hint">
                    Text shrinks to stay inside this box's fixed size. Turn this off for long body
                    copy that should scroll instead of shrinking to nothing.
                  </p>
                ) : null}
              </>
            ) : selected.type === "image" ? (
              <>
                <label className="cv-prop-full">
                  Image URL
                  <input
                    type="text"
                    placeholder="https://…"
                    value={selected.src}
                    onChange={(e) => updateElement(selected.id, { src: e.target.value })}
                  />
                </label>
                <label className="cv-prop-full">
                  Description (alt text)
                  <input
                    type="text"
                    value={selected.alt}
                    onChange={(e) => updateElement(selected.id, { alt: e.target.value })}
                  />
                </label>
              </>
            ) : (
              <label className="cv-prop-full">
                Shape
                <select
                  value={selected.shape}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      shape: e.target.value as "rectangle" | "ellipse",
                    })
                  }
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="ellipse">Ellipse</option>
                </select>
              </label>
            )}

            {/* ── SHARED APPEARANCE, §2 of the vision doc: "change
                backgrounds", "change borders/radius", "adjust
                opacity". Same four controls regardless of element
                type — see the style block in the render loop above. */}
            <hr className="cv-panel-divider" />
            <div className="cv-prop-row">
              <label>
                Background
                <input
                  type="color"
                  value={selected.backgroundColor ?? "#ffffff"}
                  onChange={(e) =>
                    updateElement(selected.id, { backgroundColor: e.target.value })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => updateElement(selected.id, { backgroundColor: null })}
              >
                No fill
              </button>
            </div>
            <div className="cv-prop-row">
              <label>
                Border
                <input
                  type="color"
                  value={selected.borderColor ?? "#141414"}
                  onChange={(e) => updateElement(selected.id, { borderColor: e.target.value })}
                />
              </label>
              <label>
                Border width
                <input
                  type="number"
                  min={0}
                  value={selected.borderWidth}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      borderWidth: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </label>
            </div>
            {selected.type !== "shape" || selected.shape === "rectangle" ? (
              <label className="cv-prop-full">
                Corner radius
                <input
                  type="number"
                  min={0}
                  value={selected.borderRadius}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      borderRadius: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </label>
            ) : null}
            <label className="cv-prop-full">
              Opacity ({selected.opacity}%)
              <input
                type="range"
                min={0}
                max={100}
                value={selected.opacity}
                onChange={(e) => updateElement(selected.id, { opacity: Number(e.target.value) })}
              />
            </label>

            <hr className="cv-panel-divider" />
            <div className="cv-prop-row">
              <button type="button" onClick={duplicateSelected}>
                Duplicate
              </button>
              <button type="button" className="cv-danger" onClick={deleteSelected}>
                Delete
              </button>
            </div>
            <div className="cv-prop-row">
              <button type="button" onClick={bringToFront}>
                Bring to front
              </button>
              <button type="button" onClick={sendToBack}>
                Send to back
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
