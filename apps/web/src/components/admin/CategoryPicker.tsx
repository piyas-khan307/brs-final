"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WHAT KIND OF EVENT THIS IS — AND ADDING A KIND THAT DOES NOT EXIST YET.
 *
 * Categories used to be a Postgres enum, which meant the list of things
 * the club could run was fixed by whoever last edited the type. Migration
 * 0015 moved them into a table; this is the box that writes to it.
 *
 * ── TWO SELECTS, NOT A TREE ──
 * A category has at most one level under it, so the whole structure fits
 * in "kind" and "which sort" — two ordinary dropdowns that work with a
 * keyboard and need no explanation. A tree widget would be a better
 * answer to a problem this does not have.
 *
 * The subcategory box is only there when the chosen category has
 * subcategories or the editor is adding one. Most events are filed
 * straight under a top-level category and never see it.
 *
 * ── ADDING ONE IS INLINE, BECAUSE THE ALTERNATIVE IS NOT DOING IT ──
 * The other design is a separate Categories screen. Then filing an event
 * under a new kind means abandoning a half-written write-up, navigating
 * away, coming back and finding the form empty — so in practice nobody
 * does it, and everything gets filed under whichever existing category
 * is closest. That is how an archive stops being true.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

import { items } from "@/lib/admin/client";
import { Button, Field, Input, Notice, Select } from "./ui";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

/** "Basic Workshop" → "basic-workshop". Matches the CHECK on the column
 *  (migration 0015), so a name that cannot make a slug is refused here
 *  rather than by the database. */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

export function CategoryPicker({
  value,
  onChange,
}: {
  /** The chosen category's id — a subcategory's when one is chosen. */
  value: string | null;
  onChange: (categoryId: string) => void;
}) {
  const [all, setAll] = useState<Category[] | null>(null);
  /* `retry` distinguishes "the list could not be read" — where the box is
     useless and the only move is to try again — from "that one could not
     be added", where the ten categories on screen still work. */
  const [error, setError] = useState<{ text: string; retry?: boolean } | null>(null);
  const [adding, setAdding] = useState<"top" | "sub" | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await items.list<Category>("event_categories", {
        fields: "id,name,slug,parent_id,sort_order",
        sort: "sort_order,name",
        limit: 500,
      });
      setAll(rows);
      return rows;
    } catch (e) {
      /* Set the list to empty, NOT left at null. Null means "still
         loading", and a load that has failed is not still loading — the
         first version of this stayed on "Loading the categories…"
         forever while the error sat in state with nothing rendering it,
         which is the worst of both: no categories and no reason why. */
      setAll([]);
      setError({ text: (e as Error).message, retry: true });
      return [];
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tops = (all ?? []).filter((c) => !c.parent_id);
  const chosen = (all ?? []).find((c) => c.id === value) ?? null;
  /* The selected row may itself be a subcategory, in which case the
     top-level box has to show its PARENT rather than nothing. */
  const topId = chosen?.parent_id ?? chosen?.id ?? "";
  const subs = (all ?? []).filter((c) => c.parent_id === topId);

  async function create(kind: "top" | "sub") {
    const name = draft.trim();
    const slug = slugify(name);
    const refuse = (text: string) => setError({ text });
    if (name.length < 2) return refuse("A category needs a name of at least two characters.");
    if (!slug) return refuse("That name has no letters or numbers in it to make a web address from.");
    if ((all ?? []).some((c) => c.slug === slug)) {
      return refuse(`There is already a category called “${name}”.`);
    }
    if (kind === "sub" && !topId) {
      return refuse("Choose the category this belongs under first.");
    }

    setBusy(true);
    setError(null);
    try {
      const created = await items.create<Category>("event_categories", {
        name,
        slug,
        parent_id: kind === "sub" ? topId : null,
        // New kinds go to the end rather than jumping the club's own
        // ordering; the list can be reordered in the CMS.
        sort_order: Math.max(0, ...(all ?? []).map((c) => c.sort_order ?? 0)) + 10,
      });
      await load();
      onChange(created.id);
      setAdding(null);
      setDraft("");
    } catch (e) {
      setError({ text: `“${name}” was not added. ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  if (all === null) {
    return <p className="text-body-s text-text-tertiary">Loading the categories…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Notice tone="error">
          {error.retry ? "The categories could not be read. " : null}
          {error.text}
          {error.retry ? (
            <>
              {" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setError(null);
                  void load();
                }}
              >
                Try again
              </button>
              .
            </>
          ) : null}
        </Notice>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" required>
          <Select
            value={topId}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "__new") {
                setAdding("top");
                setDraft("");
                return;
              }
              // Choosing a different kind drops any subcategory that
              // belonged to the old one, which would otherwise leave the
              // event filed under a child of a category it is not in.
              if (next) onChange(next);
            }}
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {tops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new">+ Add a new category…</option>
          </Select>
        </Field>

        {/* Always on screen, disabled until there is a category to hang
            one under. Rendering it only once a category is chosen means
            somebody looking for subcategories finds no evidence they
            exist. A category can have as many as the club wants; an event
            is filed under one of them. */}
        <Field label="Subcategory">
          <Select
            value={chosen?.parent_id ? chosen.id : ""}
            disabled={!topId}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "__new") {
                setAdding("sub");
                setDraft("");
                return;
              }
              // Empty means "file it under the category itself".
              onChange(next || topId);
            }}
          >
            <option value="">{topId ? "— none —" : "Choose a category first"}</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {topId ? <option value="__new">+ Add a subcategory…</option> : null}
          </Select>
        </Field>
      </div>

      {adding ? (
        <div className="space-y-3 border border-line-strong bg-bg-raised p-4">
          <Field
            label={
              adding === "top"
                ? "Name of the new category"
                : `Name of the new subcategory under “${tops.find((c) => c.id === topId)?.name ?? ""}”`
            }
            required
          >
            <Input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              placeholder={adding === "top" ? "e.g. Hackathon" : "e.g. Basic Workshop"}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void create(adding);
                }
                if (e.key === "Escape") setAdding(null);
              }}
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="primary" busy={busy} onClick={() => void create(adding)}>
              Add it
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setAdding(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
