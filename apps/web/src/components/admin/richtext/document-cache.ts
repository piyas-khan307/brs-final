"use client";

/**
 * ONE FETCH PER DOCUMENT, NOT ONE PER RENDER.
 *
 * The PDF equivalent of asset-cache.ts, for exactly the same reason: an
 * inline PDF node stores a document id, and without a cache resolving it
 * to a title and URL would re-request on every keystroke.
 */

import { items } from "@/lib/admin/client";
import type { DocumentRow } from "../documents";

const FIELDS = "id,title,bytes,storage_key,credit";

const cache = new Map<string, DocumentRow>();
const inflight = new Map<string, Promise<DocumentRow | null>>();
const listeners = new Set<() => void>();

/** Synchronous read. Null means "not here yet", not "does not exist". */
export const peekDocument = (id: string): DocumentRow | null => cache.get(id) ?? null;

/** Seed from a list already fetched for some other reason, so opening
 *  the picker does not re-request them. */
export function primeDocuments(rows: DocumentRow[]): void {
  let added = false;
  for (const r of rows) {
    if (!cache.has(r.id)) {
      cache.set(r.id, r);
      added = true;
    }
  }
  if (added) for (const l of listeners) l();
}

export function loadDocument(id: string): Promise<DocumentRow | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(id);
  if (pending) return pending;

  const p = items
    .get<DocumentRow>("documents", id, { fields: FIELDS })
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
export function onDocumentsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
