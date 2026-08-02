"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * LIST, ADD, EDIT, DELETE — for the collections that need nothing clever.
 *
 * Events, achievements, partners, press and people are all the same
 * shape of job: a list, a form, a save. Writing five near-identical
 * screens would mean five places for a bug and five places to forget an
 * explanation, so the differences live in a FIELD SPEC and the behaviour
 * lives here once.
 *
 * The committee and the blog posts deliberately do NOT use this. They
 * have real workflow — three tables behind one form, an approval step —
 * and forcing them through a generic editor is how a tool ends up
 * technically able to do everything and practically able to do nothing.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

import { PhotoPicker } from "./PhotoPicker";
import {
  Button,
  Card,
  ConfirmButton,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  Textarea,
  useFlash,
} from "./ui";
import { items } from "@/lib/admin/client";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "checkbox" | "select" | "photo" | "tags";
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Shown in the list rather than only in the form. */
  inList?: boolean;
  /** Hidden unless this returns true — used for fields that only make
   *  sense once another is set, e.g. evidence for a verified result. */
  showWhen?: (row: Record<string, unknown>) => boolean;
};

type Row = Record<string, unknown> & { id: string };

export function RecordEditor({
  collection,
  title,
  description,
  fields,
  titleField,
  sort = "-id",
  defaults = {},
}: {
  collection: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
  titleField: string;
  sort?: string;
  defaults?: Record<string, unknown>;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const load = useCallback(async () => {
    try {
      setRows(await items.list<Row>(collection, { sort, limit: 200, fields: "*" }));
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
      setRows([]);
    }
  }, [collection, sort, setFlash]);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setEditing({ id: "" } as Row);
    setDraft({ ...defaults });
  }
  function startEdit(row: Row) {
    setEditing(row);
    setDraft({ ...row });
  }

  async function save() {
    setBusy(true);
    try {
      // Only fields this editor knows about are sent. A blind `{...draft}`
      // would echo back read-only columns the server then rejects.
      const payload: Record<string, unknown> = {};
      for (const f of fields) payload[f.name] = draft[f.name] ?? null;

      if (editing?.id) await items.update(collection, editing.id, payload);
      else await items.create(collection, { ...defaults, ...payload });

      setEditing(null);
      await load();
      setFlash({ tone: "success", text: "Saved." });
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const listFields = fields.filter((f) => f.inList);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          !editing ? (
            <Button variant="primary" onClick={startNew}>
              Add
            </Button>
          ) : null
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {editing ? (
        <Card>
          <h2
            className="text-heading-m text-text-primary"
            style={{ fontVariationSettings: "'wght' 550" }}
          >
            {editing.id ? `Edit ${String(editing[titleField] ?? "")}` : `New entry`}
          </h2>

          <div className="mt-6 space-y-5">
            {fields
              .filter((f) => !f.showWhen || f.showWhen(draft))
              .map((f) => (
                <FormField
                  key={f.name}
                  spec={f}
                  value={draft[f.name]}
                  onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))}
                />
              ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line-hairline pt-6">
            <Button variant="primary" busy={busy} onClick={save}>
              Save
            </Button>
            <Button variant="quiet" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            {editing.id ? (
              <span className="ml-auto">
                <ConfirmButton
                  what={String(editing[titleField] ?? "this entry")}
                  onConfirm={async () => {
                    await items.remove(collection, editing.id);
                    setEditing(null);
                    await load();
                    setFlash({ tone: "success", text: "Deleted." });
                  }}
                >
                  Delete
                </ConfirmButton>
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}

      {rows === null ? (
        <Loading what={title.toLowerCase()} />
      ) : rows.length === 0 ? (
        <Empty>Nothing here yet. Use “Add” to create the first one.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => startEdit(r)}
                className="adm-row flex w-full flex-wrap items-baseline justify-between gap-3 px-5 py-4"
              >
                <span className="text-body-l text-text-primary">
                  {String(r[titleField] ?? "(untitled)")}
                </span>
                <span className="flex flex-wrap gap-4">
                  {listFields.map((f) => (
                    <span key={f.name} className="font-mono text-micro uppercase text-text-tertiary">
                      {formatCell(r[f.name], f)}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatCell(v: unknown, f: FieldSpec): string {
  if (v === null || v === undefined || v === "") {
    // "Not recorded" rather than a blank, so a real gap never reads as a
    // rendering bug.
    return "not recorded";
  }
  if (f.type === "checkbox") return v ? f.label : `not ${f.label.toLowerCase()}`;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function FormField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (spec.type === "photo") {
    return (
      <PhotoPicker
        label={spec.label}
        hint={spec.hint}
        value={(value as string) ?? null}
        onChange={onChange}
      />
    );
  }

  if (spec.type === "checkbox") {
    return (
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-accent"
        />
        <span>
          <span
            className="block text-body-s text-text-primary"
            style={{ fontVariationSettings: "'wght' 550" }}
          >
            {spec.label}
          </span>
          {spec.hint ? (
            <span className="mt-1 block max-w-prose text-body-s text-text-secondary">{spec.hint}</span>
          ) : null}
        </span>
      </label>
    );
  }

  const common = { required: spec.required };

  return (
    <Field label={spec.label} hint={spec.hint} required={spec.required}>
      {spec.type === "textarea" ? (
        <Textarea
          rows={5}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      ) : spec.type === "select" ? (
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} {...common}>
          <option value="">— not set —</option>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : spec.type === "tags" ? (
        <Input
          value={Array.isArray(value) ? (value as string[]).join(", ") : ""}
          placeholder="separate with commas"
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      ) : spec.type === "number" ? (
        <Input
          inputMode="numeric"
          value={value === null || value === undefined ? "" : String(value)}
          // Empty must become null, not 0. Zero is a number somebody
          // meant; empty is "not recorded".
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          {...common}
        />
      ) : (
        <Input
          type={spec.type === "date" ? "date" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          {...common}
        />
      )}
    </Field>
  );
}
