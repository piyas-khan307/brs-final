/**
 * PDF EQUIVALENT OF PhotoPicker's AssetRow / assetUrl.
 *
 * A separate table (`documents`), not a widened `assets` row — see
 * migration 0016 for why. This file is the admin-side mirror of that
 * split: its own row shape, its own URL builder, same STORAGE_BASE the
 * photographs already use, because both live in the same bucket.
 */

export type DocumentRow = {
  id: string;
  title: string;
  bytes: number;
  storage_key: string;
  credit?: string | null;
};

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "http://localhost:9000/brs-assets";

export const documentUrl = (d: Pick<DocumentRow, "storage_key">) =>
  `${STORAGE_BASE.replace(/\/+$/, "")}/${d.storage_key}`;
