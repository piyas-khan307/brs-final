"use client";

import { useCallback, useEffect, useState } from "react";

import { PhotoPicker, assetUrl, type AssetRow } from "@/components/admin/PhotoPicker";
import {
  Button,
  Card,
  ConfirmButton,
  Empty,
  Loading,
  Notice,
  PageHeader,
  useFlash,
} from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

export default function PhotosPage() {
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "archive" | "portrait">("all");
  const [uploadCategory, setUploadCategory] = useState<"archive" | "portrait">("archive");
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

  async function toggleFeatured(asset: AssetRow) {
    try {
      const nextFeatured = !asset.is_featured;
      await items.update("assets", asset.id, { is_featured: nextFeatured });
      setRows((prev) =>
        prev
          ? prev.map((a) => (a.id === asset.id ? { ...a, is_featured: nextFeatured } : a))
          : []
      );
      setFlash({
        tone: "success",
        text: nextFeatured ? "Photo featured on homepage." : "Photo unfeatured.",
      });
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
    }
  }

  async function setCategory(asset: AssetRow, nextCat: string) {
    try {
      await items.update("assets", asset.id, { category: nextCat });
      setRows((prev) =>
        prev
          ? prev.map((a) => (a.id === asset.id ? { ...a, category: nextCat } : a))
          : []
      );
      setFlash({ tone: "success", text: `Updated category to ${nextCat}.` });
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
    }
  }

  const filtered = (rows ?? []).filter((a) => {
    if (filter === "archive") return a.category !== "portrait";
    if (filter === "portrait") return a.category === "portrait";
    return true;
  });

  const featuredCount = (rows ?? []).filter((a) => a.is_featured).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Photographs"
        description="Upload originals — any size, straight off a phone. Select which photos are featured on the homepage archive 3x3 grid."
        action={
          <Button variant="primary" onClick={() => setUploading((u) => !u)}>
            {uploading ? "Done uploading" : "Upload a photograph"}
          </Button>
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {uploading ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 border-b border-line-hairline pb-3">
            <span className="text-body-s font-medium text-text-primary">Upload target:</span>
            <Button
              variant={uploadCategory === "archive" ? "primary" : "quiet"}
              onClick={() => setUploadCategory("archive")}
            >
              Archive Photo
            </Button>
            <Button
              variant={uploadCategory === "portrait" ? "primary" : "quiet"}
              onClick={() => setUploadCategory("portrait")}
            >
              Committee Portrait
            </Button>
          </div>
          <PhotoPicker
            label={`New ${uploadCategory === "portrait" ? "Committee Portrait" : "Archive Photo"}`}
            defaultCategory={uploadCategory}
            allowChooseExisting={false}
            value={null}
            onChange={() => {
              load();
              setFlash({
                tone: "success",
                text: `Uploaded as ${uploadCategory === "portrait" ? "Committee Portrait" : "Archive Photo"}.`,
              });
            }}
          />
        </Card>
      ) : null}

      {/* Category filter tabs & featured counter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-hairline pb-4">
        <div className="flex items-center gap-2">
          {(
            [
              ["all", "All Photos"],
              ["archive", "Archive Photos"],
              ["portrait", "Committee Portraits"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={filter === key ? "secondary" : "quiet"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="font-mono text-micro text-text-tertiary">
          ★ {featuredCount} featured on homepage
        </span>
      </div>

      {rows === null ? (
        <Loading what="photographs" />
      ) : filtered.length === 0 ? (
        <Empty>No photographs found in this filter category.</Empty>
      ) : (
        <>
          <p className="text-body-s text-text-tertiary">
            Showing {filtered.length} of {rows.length} photographs.
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((a) => {
              const isPortrait = a.category === "portrait";
              return (
                <li
                  key={a.id}
                  className={`relative flex flex-col justify-between border bg-bg-raised/40 p-2.5 transition-all ${a.is_featured ? "border-accent" : "border-line-hairline"
                    }`}
                >
                  <div>
                    <div className="relative">
                      <img
                        src={assetUrl(a)}
                        alt=""
                        width={a.width}
                        height={a.height}
                        loading="lazy"
                        className="aspect-square w-full object-cover border border-line-hairline"
                        style={
                          a.lqip
                            ? { backgroundImage: `url("${a.lqip}")`, backgroundSize: "cover" }
                            : undefined
                        }
                      />
                      {a.is_featured ? (
                        <span className="absolute top-1.5 right-1.5 bg-accent px-1.5 py-0.5 text-micro font-bold text-bg-base">
                          ★ Featured
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="font-mono text-micro uppercase text-text-tertiary">
                        {isPortrait ? "Portrait" : "Archive"}
                      </span>
                      <button
                        type="button"
                        className="text-micro text-text-secondary hover:text-text-primary underline"
                        onClick={() => setCategory(a, isPortrait ? "archive" : "portrait")}
                      >
                        Set {isPortrait ? "Archive" : "Portrait"}
                      </button>
                    </div>

                    <p className="mt-1 line-clamp-2 text-micro text-text-tertiary">{a.alt}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line-hairline/60 pt-2">
                    <Button
                      variant={a.is_featured ? "secondary" : "quiet"}
                      className="text-micro"
                      onClick={() => toggleFeatured(a)}
                    >
                      {a.is_featured ? "Unfeature" : "★ Feature"}
                    </Button>

                    <ConfirmButton
                      what="this photograph"
                      className="text-micro hover:text-accent"
                      onConfirm={async () => {
                        try {
                          await items.remove("assets", a.id);
                          await load();
                          setFlash({ tone: "success", text: "Photograph deleted." });
                        } catch (e) {
                          setFlash({ tone: "error", text: (e as Error).message });
                        }
                      }}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

