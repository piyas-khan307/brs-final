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
 *
 * ── THE LIBRARY MODAL CANNOT DELETE, DELIBERATELY ──
 * Every tile carried a Delete under it. This is the PICK-A-PICTURE
 * screen: the whole reason you have it open is to click on photographs,
 * and a destructive control sat one tile-width from the thing you came
 * to click. Client direction, and it is the right call — "user can
 * accidentally click delete button when selecting".
 *
 * The mismatch was in what the two buttons cost. Choosing wrongly is
 * undone by choosing again. Deleting wrongly destroys an asset row that
 * other events may reference, and the archive photographs are
 * irreplaceable — many exist nowhere else (docs/DEPLOY.md, "Backups").
 * Guarding it with a confirm was not enough, because the confirm was
 * also inside the grid being clicked through.
 *
 * Deleting still exists, on /admin/photos, whose entire job is managing
 * the library rather than borrowing from it. Nothing was lost here
 * except the chance to do it by accident.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { items } from "@/lib/admin/client";
import { uploadAsset } from "@/lib/admin/ingest";
import { Button, Field, Input, Notice, Empty, Modal } from "./ui";

export { INGEST_URL } from "@/lib/admin/ingest";

export type AssetRow = {
  id: string;
  alt: string;
  width: number;
  height: number;
  lqip: string | null;
  storage_key: string;
  category?: string;
  is_featured?: boolean;
};

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "http://localhost:9000/brs-assets";

export const assetUrl = (a: Pick<AssetRow, "storage_key">) =>
  `${STORAGE_BASE.replace(/\/+$/, "")}/${a.storage_key}`;

export function altProblem(alt: string): string | null {
  const t = alt.trim();
  if (!t) return null;
  if (t.length < 12) return "If provided, description should be at least a dozen characters.";
  if (t.split(/\s+/).length < 3) return "If provided, write at least three words.";
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
  defaultCategory = "archive",
  allowChooseExisting = true,
}: {
  value: string | null;
  onChange: (assetId: string | null) => void;
  label?: string;
  hint?: string;
  defaultCategory?: "archive" | "portrait" | "general";
  allowChooseExisting?: boolean;
}) {
  const [existing, setExisting] = useState<AssetRow[] | null>(null);
  const [mode, setMode] = useState<"idle" | "upload">(allowChooseExisting ? "idle" : "upload");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!allowChooseExisting) return;
    items
      .list<AssetRow>("assets", {
        fields: "id,alt,width,height,lqip,storage_key",
        sort: "-id",
        limit: 100,
      })
      .then(setExisting)
      .catch((e) => setError((e as Error).message));
  }, [allowChooseExisting]);

  const [chosen, setChosen] = useState<AssetRow | null>(null);
  const [missing, setMissing] = useState(false);

  /**
   * THE CHOSEN PHOTOGRAPH IS FETCHED BY ID WHEN THE LIBRARY DOES NOT
   * HAPPEN TO CONTAIN IT.
   *
   * The list above is the hundred most recent assets — a browsing aid,
   * not an index. There are 574. So an event whose cover was ingested
   * last year showed "No photo selected" while holding a perfectly good
   * cover: the picker was reporting what it could not find rather than
   * what was set, and the editor's obvious next move is to pick a new
   * one and overwrite a choice that was never lost.
   */
  useEffect(() => {
    setMissing(false);
    if (!value) return setChosen(null);
    if (chosen?.id === value) return;
    const known = existing?.find((a) => a.id === value);
    if (known) return setChosen(known);

    let cancelled = false;
    items
      .get<AssetRow>("assets", value, { fields: "id,alt,width,height,lqip,storage_key" })
      .then((a) => {
        if (!cancelled) setChosen(a);
      })
      .catch(() => {
        // A record pointing at a deleted photograph is a real state, and
        // it is named below rather than shown as an empty field.
        if (cancelled) return;
        setChosen(null);
        setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, existing, chosen]);

  const selected = chosen?.id === value ? chosen : null;
  const filteredPhotos = (existing ?? []).filter((a) =>
    searchQuery.trim()
      ? a.alt.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true
  );

  async function upload() {
    if (!file) return setError("Choose a file first.");
    const problem = altProblem(alt);
    if (problem) return setError(problem);

    setBusy(true);
    setError(null);
    try {
      const assetId = await uploadAsset(file, {
        alt,
        category: defaultCategory,
        credit,
      });

      if (defaultCategory !== "archive") {
        try {
          await items.update("assets", assetId, { category: defaultCategory });
        } catch {
          // non-blocking
        }
      }

      onChange(assetId);
      if (allowChooseExisting) {
        setExisting(
          await items.list<AssetRow>("assets", {
            fields: "id,alt,width,height,lqip,storage_key",
            sort: "-id",
            limit: 100,
          })
        );
        setMode("idle");
      }
      setFile(null);
      setAlt("");
      setCredit("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage(`Photograph uploaded successfully as ${defaultCategory === "portrait" ? "Committee Portrait" : "Archive Photo"}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-body-s text-text-primary" style={{ fontVariationSettings: "'wght' 550" }}>
          {label}
        </span>
        {allowChooseExisting ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMode("idle");
                setIsModalOpen(true);
              }}
            >
              Choose existing photo
            </Button>
            <Button
              variant={mode === "upload" ? "secondary" : "quiet"}
              onClick={() => setMode(mode === "upload" ? "idle" : "upload")}
            >
              {mode === "upload" ? "Cancel upload" : "Upload new"}
            </Button>
          </div>
        ) : null}
      </div>

      {hint ? <p className="max-w-prose text-body-s text-text-secondary">{hint}</p> : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Selected photo preview block */}
      {selected ? (
        <div className="flex items-center gap-4 border border-line-strong bg-bg-raised p-3">
          <img
            src={assetUrl(selected)}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 object-cover border border-line-hairline"
          />
          <span className="min-w-0 flex-1 text-body-s text-text-secondary line-clamp-2">
            {selected.alt}
          </span>
          <Button variant="quiet" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : missing ? (
        <Notice tone="warning">
          This record points at a photograph that is no longer in the library — it was probably
          deleted. Choose another one.
        </Notice>
      ) : value && !selected ? (
        // Set, but not resolved yet. Saying "No photo selected" here is
        // how somebody overwrites a cover that was only slow to load.
        <div className="border border-dashed border-line-hairline bg-bg-inset p-3 text-body-s text-text-tertiary">
          Loading the chosen photograph…
        </div>
      ) : mode === "idle" && allowChooseExisting ? (
        <div className="flex items-center justify-between border border-dashed border-line-hairline bg-bg-inset p-3 text-body-s text-text-tertiary">
          <span>No photo selected</span>
          <Button variant="quiet" onClick={() => setIsModalOpen(true)}>
            Browse photos
          </Button>
        </div>
      ) : null}

      {/* Inline Upload Form */}
      {mode === "upload" ? (
        <div className="space-y-4 border border-line-hairline bg-bg-raised p-4">
          {successMessage ? <Notice tone="success">{successMessage}</Notice> : null}
          <Field
            label="Image file"
            required
            hint="Any size, straight off a phone or camera. It is resized automatically, and location data is removed."
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                setSuccessMessage(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            {previewUrl ? (
              <div className="mt-3 flex items-center gap-3 border border-line-hairline bg-bg-base p-2.5">
                <img
                  src={previewUrl}
                  alt="Selected file preview"
                  className="h-14 w-14 shrink-0 object-cover border border-line-hairline"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-s font-medium text-text-primary truncate">
                    {file?.name}
                  </p>
                  <p className="text-micro font-mono text-text-tertiary">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                  </p>
                </div>
              </div>
            ) : null}
          </Field>

          <Field
            label="Description (Optional)"
            hint="What is in the picture? If left blank, a default description will be assigned automatically."
            error={alt.trim() ? (altProblem(alt) ?? undefined) : undefined}
          >
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Committee portrait" />
          </Field>

          <Field label="Photographer" hint="Who took it, if you know.">
            <Input value={credit} onChange={(e) => setCredit(e.target.value)} />
          </Field>

          <Button variant="primary" onClick={upload} busy={busy} disabled={!file || (alt.trim() ? !!altProblem(alt) : false)}>
            Upload
          </Button>
          {busy ? (
            <p className="text-body-s text-text-secondary">
              Processing — a large photograph takes a few seconds. Please do not close this page.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Photo Library Modal Popup */}
      <Modal
        title="Photo Library"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          <Input
            placeholder="Search photos by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {existing === null ? (
            <p className="py-8 text-center text-body-s text-text-tertiary">Loading photographs…</p>
          ) : filteredPhotos.length === 0 ? (
            <Empty>No matching photographs found.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredPhotos.map((a) => (
                <li key={a.id} className="relative flex flex-col justify-between border border-line-hairline bg-bg-base/40 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setIsModalOpen(false);
                    }}
                    aria-label={a.alt}
                    aria-pressed={value === a.id}
                    className={`group relative block w-full text-left border-2 transition-all ${
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
                    <div className="p-1 text-micro text-text-secondary truncate">
                      {a.alt}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}

