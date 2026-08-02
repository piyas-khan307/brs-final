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

import { useEffect, useState } from "react";

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
  busy?: boolean;
};

export function Button({ variant = "secondary", busy, children, className = "", ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-body-s transition-colors duration-micro ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
  const variants = {
    primary: "border-accent bg-accent text-white hover:bg-accent-deep",
    secondary: "border-line-strong bg-bg-raised text-text-primary hover:bg-bg-inset",
    danger: "border-accent bg-bg-raised text-accent hover:bg-accent hover:text-white",
    quiet: "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={busy || rest.disabled} {...rest}>
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin border-2 border-current border-t-transparent"
      style={{ borderRadius: "50%" }}
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
      <span className="block text-body-s text-text-primary" style={{ fontVariationSettings: "'wght' 550" }}>
        {label}
        {required ? <span className="ml-1 text-accent" aria-hidden="true">*</span> : null}
        {!required ? <span className="ml-2 text-body-s text-text-tertiary">optional</span> : null}
      </span>
      {hint ? <span className="mt-1 block max-w-prose text-body-s text-text-secondary">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-2 block text-body-s text-accent" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const controlClass =
  "w-full border border-line-strong bg-bg-raised px-3 py-2.5 text-body-m text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-focus-ring";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ""}`} />;
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
      className={`border-l-2 px-4 py-3 text-body-s ${tones[tone]}`}
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

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-hairline pb-6">
      <div>
        <h1 className="text-heading-l text-text-primary" style={{ fontVariationSettings: "'wght' 600" }}>
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-prose text-body-m text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-line-hairline bg-bg-raised p-6 ${className}`}>{children}</div>
  );
}

/** Shown in place of a list that has nothing in it — never an empty box.
 *  An empty state that does not say what to do next is a dead end. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-6 py-12 text-center text-body-m text-text-secondary">
      {children}
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p className="py-12 text-center text-body-m text-text-tertiary" role="status">
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

  // Quiet until it is armed. A delete button styled as loudly as the
  // action beside it competes for attention it should not have — and on
  // this screen the button next to it is "Add a person".
  if (!armed) {
    return (
      <Button variant="quiet" onClick={() => setArmed(true)} {...rest}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-body-s text-text-secondary">Delete {what}?</span>
      <Button variant="danger" onClick={onConfirm}>
        Yes, delete
      </Button>
      <Button variant="quiet" onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </span>
  );
}
