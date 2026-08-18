"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ADMIN PANEL'S PARTS.
 *
 * Deliberately plain. The public site is a museum catalogue and can
 * afford to be; this is a tool somebody uses on a Tuesday to correct a
 * spelling, and its job is to be obvious rather than beautiful.
 *
 * Everything here uses the same tokens as the rest of the site, so the
 * admin panel does not look like a different product — but the type is
 * larger, the targets are bigger, and nothing moves.
 * ══════════════════════════════════════════════════════════════════════
 */

import * as React from "react";
import { useEffect, useState } from "react";

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
  busy?: boolean;
};

/**
 * Every state a button has, and none of them invented here — the whole
 * interaction language lives in the `.adm-btn` block in globals.css, so
 * "what does hover do" is one question with one answer in one place.
 *
 * rest → hover → active(depressed 1px) → focus-visible → disabled → busy
 */
export function Button({ variant = "secondary", busy, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`adm-btn adm-btn-${variant} ${className}`}
      disabled={busy || rest.disabled}
      // Tells a screen reader the press was received and is still
      // working. Without it, a spinner is a purely visual promise.
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="adm-spin inline-block h-4 w-4 border-2 border-current border-t-transparent"
    />
  );
}

/* ── Fields ───────────────────────────────────────────────────────────── */

/**
 * A labelled control with its explanation ABOVE the input, not below.
 *
 * Help text under a field is read after the mistake has been made. The
 * alt-text rule in particular is a rule you need before you type, not
 * after the save fails.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {/* Required is MARKED; optional is simply unmarked.
          Labelling every optional field "optional" put the word on nine
          fields out of ten — including a dropdown, where it means
          nothing — and a marker that appears almost everywhere has
          stopped being a marker. */}
      <span className="block text-body-m text-text-primary" style={{ fontVariationSettings: "'wght' 600" }}>
        {label}
        {required ? (
          <span className="ml-2 font-mono text-micro uppercase text-accent">required</span>
        ) : null}
      </span>
      {hint ? <span className="mt-1.5 block max-w-prose text-body-s text-text-secondary">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-2 block text-body-s text-accent" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} {...props} className={`adm-input ${props.className ?? ""}`} />
);
Input.displayName = "Input";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`adm-input ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`adm-input ${props.className ?? ""}`} />;
}

/* ── Feedback ─────────────────────────────────────────────────────────── */

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-line-strong bg-bg-raised text-text-secondary",
    success: "border-success bg-bg-raised text-text-primary",
    error: "border-accent bg-bg-raised text-text-primary",
    warning: "border-warning bg-bg-raised text-text-primary",
  };
  return (
    <div
      className={`border-l-2 px-5 py-4 text-body-m ${tones[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

/**
 * A save result that announces itself and then gets out of the way.
 *
 * Errors do NOT auto-dismiss: a message that vanishes before it is read
 * is worse than no message, and the one time it matters is the one time
 * somebody looked away.
 */
export function useFlash() {
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (flash?.tone !== "success") return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);
  return [flash, setFlash] as const;
}

/* ── Structure ────────────────────────────────────────────────────────── */

/**
 * The page title, set on the display scale rather than as a slightly bold
 * paragraph. An admin screen with timid headings reads as a form someone
 * generated; the club's site has a voice and this is still the club's
 * site.
 *
 * The rule under it is `line-strong`, not `hairline` — the heaviest
 * hairline the system has. It is the one structural division on the page
 * and it should be the one you see first.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line-strong pb-6">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="block font-mono text-micro uppercase text-text-tertiary">{eyebrow}</span>
        ) : null}
        <h1
          className="mt-2 text-display-m text-text-primary"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-prose text-body-l text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`adm-card p-6 md:p-8 ${className}`}>{children}</div>
  );
}

/** Shown in place of a list that has nothing in it — never an empty box.
 *  An empty state that does not say what to do next is a dead end. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-6 py-16 text-center text-body-l text-text-secondary bg-bg-inset">
      {children}
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p
      className="flex items-center justify-center gap-3 py-16 text-body-m text-text-tertiary"
      role="status"
    >
      <span
        aria-hidden="true"
        className="adm-spin inline-block h-4 w-4 border-2 border-current border-t-transparent"
      />
      Loading {what}…
    </p>
  );
}

/**
 * Destructive actions confirm, and the confirmation names the thing.
 * "Are you sure?" is a question nobody can answer; "Delete Arnab Nandi?"
 * is one they can.
 */
export function ConfirmButton({
  onConfirm,
  what,
  children,
  ...rest
}: ButtonProps & { onConfirm: () => void; what: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <Button variant="quiet" onClick={() => setArmed(true)} {...rest}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1 text-right">
      <span className="font-mono text-micro uppercase text-accent">Delete {what}?</span>
      <div className="flex items-center gap-1">
        <Button variant="danger" className="text-micro px-2 py-0.5" onClick={onConfirm}>
          Yes
        </Button>
        <Button variant="quiet" className="text-micro px-2 py-0.5" onClick={() => setArmed(false)}>
          Cancel
        </Button>
      </div>
    </span>
  );
}

/**
 * Modal Dialog overlay component for editing items in admin screens.
 */
export function Modal({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div
        className="w-full max-w-lg border border-line-strong bg-bg-raised p-6 md:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line-hairline pb-4 mb-6">
          <h2 className="text-heading-m text-text-primary font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary px-2 py-1 text-body-m"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

