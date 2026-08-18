"use client";

/**
 * ONE FETCH PER PHOTOGRAPH, NOT ONE PER RENDER.
 *
 * An inline picture is stored as an asset id, so every image node view
 * has to turn that id into a URL and a pair of dimensions. Without a
 * cache, an article with twelve photographs issues twelve requests on
 * mount, and then twelve more every time React re-renders the editor —
 * which, in a contenteditable, is on roughly every keystroke.
 *
 * The map is module-level and never evicted. It holds a few dozen small
 * rows for the lifetime of one admin page, which is the right trade
 * against re-fetching; the admin panel is a session, not a long-lived
 * tab, and a photograph's dimensions do not change.
 */

import { items } from "@/lib/admin/client";
import type { AssetRow } from "../PhotoPicker";

const FIELDS = "id,alt,width,height,lqip,storage_key";

const cache = new Map<string, AssetRow>();
const inflight = new Map<string, Promise<AssetRow | null>>();
const listeners = new Set<() => void>();

/** Synchronous read. Null means "not here yet", not "does not exist". */
export const peekAsset = (id: string): AssetRow | null => cache.get(id) ?? null;

/** Seed from a list already fetched for some other reason — the picker's
 *  hundred most recent, say — so opening it does not re-request them. */
export function primeAssets(rows: AssetRow[]): void {
  let added = false;
  for (const r of rows) {
    if (!cache.has(r.id)) {
      cache.set(r.id, r);
      added = true;
    }
  }
  if (added) for (const l of listeners) l();
}

export function loadAsset(id: string): Promise<AssetRow | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(id);
  if (pending) return pending;

  const p = items
    .get<AssetRow>("assets", id, { fields: FIELDS })
    .then((row) => {
      cache.set(id, row);
      for (const l of listeners) l();
      return row;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}

/** Node views subscribe so a late arrival repaints them. */
export function onAssetsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
