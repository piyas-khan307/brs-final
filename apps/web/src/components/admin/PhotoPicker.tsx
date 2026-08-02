"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * CHOOSE A PHOTOGRAPH, OR ADD ONE.
 *
 * ── WHY UPLOADS GO TO @brs/ingest AND NOT TO DIRECTUS ──
 * Directus would happily accept the file and store it. It would also
 * store it AS IS: the original 8 MB phone photo, with its orientation
 * flag, and with the GPS coordinates of wherever it was taken. Every
 * derivative, every format, and the whole privacy control would be gone.
 *
 * The ingest service is the thing that makes "just upload it" safe. So
 * this component posts there, and Directus only ever sees the finished
 * `assets` row.
 *
 * ── THE ALT TEXT RULE IS EXPLAINED BEFORE IT IS ENFORCED ──
 * The database refuses a description shorter than three words, a
 * filename, or anything starting with "photo". That refusal is correct
 * and, arriving after a 40-second upload, infuriating. So the rule is
 * stated above the box, and checked here before the file is sent.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";

import { getAccessToken, items } from "@/lib/admin/client";
import { Button, Field, Input, Notice, Empty } from "./ui";

export const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL ?? "http://localhost:8790";

export type AssetRow = {
  id: string;
  alt: string;
  width: number;
  height: number;
  lqip: string | null;
  storage_key: string;
};

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "http://localhost:9000/brs-assets";

export const assetUrl = (a: Pick<AssetRow, "storage_key">) =>
  `${STORAGE_BASE.replace(/\/+$/, "")}/${a.storage_key}`;

/**
 * The same checks `assets_alt_check` makes, run before the upload rather
 * than after it. Kept deliberately in step with migration 0002 — if the
 * constraint changes, this must too, and the constraint remains the one
 * that decides.
 */
export function altProblem(alt: string): string | null {
  const t = alt.trim();
  if (t.length < 12) return "Too short — write at least a dozen characters.";
  if (t.split(/\s+/).length < 3) return "Write at least three words.";
  if (/\.(jpe?g|png|webp|avif|heic|gif)$/i.test(t)) return "That is a filename, not a description.";
  if (/^(photo|image|img)\b/i.test(t)) {
    return "Do not start with “photo”, “image” or “IMG” — say what is actually in the picture.";
  }
  return null;
}

export function PhotoPicker({
  value,
  onChange,
  label = "Photograph",
  hint,
}: {
  value: string | null;
  onChange: (assetId: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const [existing, setExisting] = useState<AssetRow[] | null>(null);
  const [mode, setMode] = useState<"choose" | "upload">("choose");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    items
      .list<AssetRow>("assets", {
        fields: "id,alt,width,height,lqip,storage_key",
        sort: "-id",
        limit: 60,
      })
      .then(setExisting)
      .catch((e) => setError((e as Error).message));
  }, []);

  const selected = existing?.find((a) => a.id === value) ?? null;

  async function upload() {
    if (!file) return setError("Choose a file first.");
    const problem = altProblem(alt);
    if (problem) return setError(problem);

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("alt", alt.trim());
      if (credit.trim()) form.set("credit", credit.trim());
      form.set("published", "true");

      // The signed-in user's own Directus token, NOT the ingest shared
      // secret. The uploader verifies it by asking Directus who it
      // belongs to. A shared secret shipped to a browser would not be a
      // secret, and every visitor could write to object storage.
      const token = getAccessToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const res = await fetch(`${INGEST_URL}/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = (await res.json()) as { assetId?: string; error?: string };
      if (!res.ok || !body.assetId) throw new Error(body.error ?? `Upload failed (${res.status})`);

      onChange(body.assetId);
      setExisting(
        await items.list<AssetRow>("assets", {
          fields: "id,alt,width,height,lqip,storage_key",
          sort: "-id",
          limit: 60,
        }),
      );
      setMode("choose");
      setFile(null);
      setAlt("");
      setCredit("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-body-s text-text-primary" style={{ fontVariationSettings: "'wght' 550" }}>
          {label}
        </span>
        <div className="flex gap-2">
          <Button variant={mode === "choose" ? "secondary" : "quiet"} onClick={() => setMode("choose")}>
            Choose existing
          </Button>
          <Button variant={mode === "upload" ? "secondary" : "quiet"} onClick={() => setMode("upload")}>
            Upload new
          </Button>
        </div>
      </div>
      {hint ? <p className="max-w-prose text-body-s text-text-secondary">{hint}</p> : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {selected ? (
        <div className="flex items-center gap-4 border border-line-strong bg-bg-raised p-3">
          <img
            src={assetUrl(selected)}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 object-cover"
          />
          <span className="min-w-0 flex-1 text-body-s text-text-secondary">{selected.alt}</span>
          <Button variant="quiet" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : null}

      {mode === "upload" ? (
        <div className="space-y-4 border border-line-hairline bg-bg-raised p-4">
          <Field
            label="Image file"
            required
            hint="Any size, straight off a phone or camera. It is resized automatically, and location data is removed."
          >
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          <Field
            label="Description"
            required
            hint="What is in the picture? This is read aloud to blind visitors and shown if the image fails to load. At least three words — “Line-following robot on the practice track”, not “photo” or a filename."
            error={alt.trim() ? (altProblem(alt) ?? undefined) : undefined}
          >
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>

          <Field label="Photographer" hint="Who took it, if you know.">
            <Input value={credit} onChange={(e) => setCredit(e.target.value)} />
          </Field>

          <Button variant="primary" onClick={upload} busy={busy} disabled={!file || !!altProblem(alt)}>
            Upload
          </Button>
          {busy ? (
            <p className="text-body-s text-text-secondary">
              Processing — a large photograph takes a few seconds. Please do not close this page.
            </p>
          ) : null}
        </div>
      ) : existing === null ? (
        <p className="text-body-s text-text-tertiary">Loading photographs…</p>
      ) : existing.length === 0 ? (
        <Empty>No photographs yet. Use “Upload new”.</Empty>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
          {existing.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onChange(a.id)}
                // The description is the accessible name: a grid of
                // buttons all called "image" is unusable with a screen
                // reader, and the alt text is exactly the right words.
                aria-label={a.alt}
                aria-pressed={value === a.id}
                className={`block w-full border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  value === a.id ? "border-accent" : "border-transparent hover:border-line-strong"
                }`}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
