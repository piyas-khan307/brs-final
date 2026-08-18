"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * PUTTING A PHOTOGRAPH INTO THE LIBRARY.
 *
 * One function, because there are now two screens that upload — the
 * full picker (cover photographs, committee portraits) and the bare
 * file-only one inside the write-up editor. They differ in how much they
 * ask the person; they must not differ in what they do with the file.
 *
 * ── WHY THIS POSTS TO @brs/ingest AND NOT TO DIRECTUS ──
 * Directus would happily accept the file and store it AS IS: the
 * original 8 MB phone photo, with its orientation flag, and with the GPS
 * coordinates of wherever it was taken. Every derivative, every format,
 * and the whole privacy control would be gone. The ingest service is
 * what makes "just upload it" safe, so Directus only ever sees the
 * finished `assets` row.
 * ══════════════════════════════════════════════════════════════════════
 */

import { getAccessToken } from "./client";

export const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL ?? "http://localhost:8790";

/**
 * WHAT A PHOTOGRAPH IS CALLED WHEN NOBODY SAID.
 *
 * `assets.alt` is guarded by a CHECK (migration 0002): twelve characters
 * or more, three words or more, not a filename, and not starting with
 * "photo", "image", "img", "untitled", "screenshot" and friends. The
 * constraint exists because forty-two rows of "IMG_2841.jpg" is what an
 * archive looks like when alt text is optional and unenforced.
 *
 * The editor's picture upload deliberately asks for nothing but the
 * file, so something has to satisfy that rule. This does, and it is
 * honest about being a placeholder rather than pretending to describe a
 * picture it has not seen. Real alt text is set per-image on the
 * selected picture in the write-up, where the writer can see what they
 * are describing.
 */
export const DEFAULT_ALT = "BUET Robotics Society archive photograph";

export type UploadOptions = {
  alt?: string;
  category?: "archive" | "portrait" | "general";
  credit?: string;
};

/** Returns the new asset's id. Throws with a readable message. */
export async function uploadAsset(file: File, opts: UploadOptions = {}): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const form = new FormData();
  form.set("file", file);
  form.set("alt", opts.alt?.trim() || DEFAULT_ALT);
  form.set("category", opts.category ?? "archive");
  if (opts.credit?.trim()) form.set("credit", opts.credit.trim());
  form.set("published", "true");

  const res = await fetch(`${INGEST_URL}/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const body = (await res.json().catch(() => ({}))) as { assetId?: string; error?: string };
  if (!res.ok || !body.assetId) throw new Error(body.error ?? `Upload failed (${res.status})`);
  return body.assetId;
}
