"use client";

/**
 * Photographs.
 *
 * Uploading is the whole job, and the PhotoPicker already does it — this
 * page is the place to do it without first opening something else, plus
 * a way to fix a description after the fact.
 *
 * Descriptions matter more than they look. They are what a blind visitor
 * hears in place of the image, and the database refuses a bad one, so
 * correcting them is a real task rather than tidying.
 */

import { useCallback, useEffect, useState } from "react";

import { PhotoPicker, altProblem, assetUrl, type AssetRow } from "@/components/admin/PhotoPicker";
import {
  Button,
  Card,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  useFlash,
} from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

export default function PhotosPage() {
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(
        await items.list<AssetRow>("assets", {
          fields: "id,alt,width,height,lqip,storage_key",
          sort: "-id",
          limit: 200,
        }),
      );
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
      setRows([]);
    }
  }, [setFlash]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Photographs"
        description="Upload originals — any size, straight off a phone. Sizes and formats are made automatically, and location data is stripped."
        action={
          <Button variant="primary" onClick={() => setUploading((u) => !u)}>
            {uploading ? "Done uploading" : "Upload a photograph"}
          </Button>
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {uploading ? (
        <Card>
          <PhotoPicker
            label="New photograph"
            value={null}
            onChange={() => {
              load();
              setFlash({ tone: "success", text: "Uploaded." });
            }}
          />
        </Card>
      ) : null}

      {editing ? (
        <Card>
          <div className="flex flex-wrap gap-6">
            <img
              src={assetUrl(editing)}
              alt=""
              className="h-40 w-40 shrink-0 border border-line-hairline object-cover"
            />
            <div className="min-w-64 flex-1 space-y-4">
              <Field
                label="Description"
                required
                hint="What is in the picture? Read aloud to blind visitors. At least three words, not a filename."
                error={alt.trim() ? (altProblem(alt) ?? undefined) : undefined}
              >
                <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
              </Field>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={!!altProblem(alt)}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await items.update("assets", editing.id, { alt: alt.trim() });
                      setEditing(null);
                      await load();
                      setFlash({ tone: "success", text: "Description updated." });
                    } catch (e) {
                      setFlash({ tone: "error", text: (e as Error).message });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save
                </Button>
                <Button variant="quiet" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {rows === null ? (
        <Loading what="photographs" />
      ) : rows.length === 0 ? (
        <Empty>No photographs yet.</Empty>
      ) : (
        <>
          <p className="text-body-s text-text-tertiary">
            {rows.length} photographs. Click one to correct its description.
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {rows.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-label={`Edit description: ${a.alt}`}
                  onClick={() => {
                    setEditing(a);
                    setAlt(a.alt);
                  }}
                  className="block w-full border border-line-hairline transition-colors duration-micro ease-out hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <img
                    src={assetUrl(a)}
                    alt=""
                    width={a.width}
                    height={a.height}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                    style={a.lqip ? { backgroundImage: `url("${a.lqip}")`, backgroundSize: "cover" } : undefined}
                  />
                </button>
                <p className="mt-2 line-clamp-2 text-body-s text-text-tertiary">{a.alt}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
