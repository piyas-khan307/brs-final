"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * SEE THE PHONE WHILE YOU ARE STILL DESIGNING FOR IT.
 *
 * Three buttons that narrow the writing surface to the width a real
 * article actually gets on a real screen. A layout area restacks, three
 * columns become one, a floated picture goes full width — live, in the
 * box, without publishing anything.
 *
 * ── WHY THE NUMBERS ARE NOT 390, 834, 1440 ──
 * Because a phone is 390px wide and the ARTICLE on it is not. The page
 * is `max-w-shell px-6 md:px-16` with the write-up capped at
 * `max-w-content`, so the column a reader actually reads is:
 *
 *     390 window  − 24px gutter × 2          = 342
 *     834 window  − 64px gutter × 2 (md up)  = 706
 *    1440 window  − 64px × 2, capped at 1200 = 1200
 *
 * Previewing at 390 would show a column narrower than any reader will
 * ever see and would fire breakpoints early — a preview that lies in
 * the safe direction is still a preview that lies. These three numbers
 * are the real thing, and they are derived from the page's own layout
 * classes rather than guessed. If that layout changes, so do these, and
 * the comment above is how the next person knows to.
 *
 * ── WHY THIS WORKS AT ALL ──
 * Because the write-up's breakpoints are CONTAINER queries against
 * `.prose.rt-doc` — see the note on that rule in globals.css. Under
 * media queries, narrowing this box would have changed nothing: the
 * window is still a laptop. Narrowing the container IS the phone.
 *
 * ── WHY THE CHOICE LIVES OUTSIDE REACT STATE ──
 * Two bars exist — one over the Write tab, one over Preview — and they
 * are in different component trees. A module-level value with
 * subscribers keeps them agreeing without threading state through the
 * page that happens to own both.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";

export type DeviceId = "full" | "desktop" | "tablet" | "phone";

export const DEVICES: { id: DeviceId; label: string; width: number | null; title: string }[] = [
  { id: "full", label: "Fit", width: null, title: "Fill the admin panel — not a real reading width" },
  { id: "desktop", label: "Desktop", width: 1200, title: "The article column on a desktop (1440px screen)" },
  { id: "tablet", label: "Tablet", width: 706, title: "The article column on a tablet (834px screen)" },
  { id: "phone", label: "Phone", width: 342, title: "The article column on a phone (390px screen)" },
];

/* ── The shared choice ─────────────────────────────────────────────── */

let current: DeviceId = "full";
const listeners = new Set<(d: DeviceId) => void>();

const setDevice = (d: DeviceId) => {
  current = d;
  for (const fn of listeners) fn(d);
};

/** The chosen device, and a re-render whenever any bar changes it. */
export function useDevice(): [DeviceId, (d: DeviceId) => void] {
  const [value, setValue] = useState<DeviceId>(current);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return [value, setDevice];
}

/** What to spread onto the box that holds `.prose.rt-doc`. */
export function deviceProps(device: DeviceId) {
  const width = DEVICES.find((d) => d.id === device)?.width ?? null;
  return {
    "data-device": device,
    style: width ? ({ "--adm-device-w": `${width}px` } as React.CSSProperties) : undefined,
  };
}

export function DeviceBar() {
  const [device, choose] = useDevice();

  return (
    <div
      role="group"
      aria-label="Preview width"
      className="flex flex-wrap items-center gap-1 border-b border-line-hairline bg-bg-raised px-2 py-1"
    >
      <span className="mr-1 font-mono text-micro uppercase tabular text-text-tertiary">
        Width
      </span>
      {DEVICES.map((d) => (
        <button
          key={d.id}
          type="button"
          title={d.title}
          aria-pressed={device === d.id}
          // Mousedown-and-prevent, like the toolbar: a click would blur
          // the editor and collapse the selection first.
          onMouseDown={(e) => {
            e.preventDefault();
            choose(d.id);
          }}
          className={`border px-2 py-1 text-micro uppercase transition-colors ${
            device === d.id
              ? "border-accent bg-bg-base text-text-primary"
              : "border-transparent text-text-secondary hover:border-line-hairline hover:text-text-primary"
          }`}
        >
          {d.label}
          {d.width ? <span className="ml-1 tabular text-text-tertiary">{d.width}</span> : null}
        </button>
      ))}
      {device !== "full" ? (
        <span className="ml-2 text-micro text-text-tertiary">
          Showing the real article column. Keep writing — it stays live.
        </span>
      ) : null}
    </div>
  );
}
