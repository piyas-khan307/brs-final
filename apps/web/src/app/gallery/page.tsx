"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "http://localhost:9000/brs-assets";

type ArchiveAsset = {
  id: string;
  alt: string;
  width: number;
  height: number;
  lqip: string | null;
  storage_key: string;
  category?: string;
};

const assetUrl = (a: Pick<ArchiveAsset, "storage_key">) =>
  `${STORAGE_BASE.replace(/\/+$/, "")}/${a.storage_key}`;

export default function GalleryPage() {
  const [photos, setPhotos] = useState<ArchiveAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ArchiveAsset | null>(null);

  useEffect(() => {
    fetch(`${DIRECTUS_URL}/items/assets?limit=300&sort=-created_at`)
      .then((res) => res.json())
      .then((data: { data?: ArchiveAsset[] }) => {
        if (Array.isArray(data.data)) {
          // Filter out individual committee portraits so only Archive photos show
          const archiveOnly = data.data.filter((a) => a.category !== "portrait");
          setPhotos(archiveOnly);
        }
      })
      .catch(() => {
        setPhotos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = photos.filter((p) =>
    searchQuery.trim()
      ? p.alt.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Fixed masthead */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line-hairline bg-bg-base px-6 py-4 md:px-16">
        <a
          href="/"
          className="flex items-center gap-3 font-mono text-micro uppercase tracking-widest text-text-primary no-underline"
        >
          <Mark size="sm" label="BUET Robotics Society" />
          <span className="hidden text-text-tertiary sm:inline">
            BUET Robotics Society
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-6 md:gap-10">
            {[
              ["Home", "/"],
              ["Events", "/events"],
              ["Committee", "/executive-committee"],
              ["Achievements", "/achievements"],
            ].map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="font-mono text-micro uppercase text-text-secondary no-underline transition-colors hover:text-accent"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-shell px-6 py-12 md:px-16 md:py-20">
        <div className="space-y-4 border-b border-line-hairline pb-8">
          <span className="font-mono text-micro uppercase tracking-widest text-text-tertiary">
            03 — Photo Archive
          </span>
          <h1 className="text-display-l font-semibold text-text-primary">
            The Photo Archive
          </h1>
          <p className="max-w-2xl text-body-l text-text-secondary">
            Competition arenas, workshop floors, committee rooms, and build benches — catalogued across every generation of BUET Robotics Society.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-md">
            <input
              type="text"
              placeholder="Search archive by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-line-hairline bg-bg-raised px-4 py-2.5 text-body-m text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Photos Grid */}
        <div className="pt-10">
          {loading ? (
            <p className="py-20 text-center text-body-m text-text-tertiary">
              Loading archive photographs...
            </p>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-line-strong p-16 text-center text-body-l text-text-secondary">
              No matching photographs found in the archive.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-body-s text-text-tertiary font-mono">
                Showing {filtered.length} photographs
              </p>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filtered.map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative block aspect-square w-full overflow-hidden border border-line-hairline bg-bg-raised transition-all hover:border-accent focus:outline-none"
                    >
                      <img
                        src={assetUrl(photo)}
                        alt={photo.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={
                          photo.lqip
                            ? { backgroundImage: `url("${photo.lqip}")`, backgroundSize: "cover" }
                            : undefined
                        }
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="line-clamp-2 text-micro text-text-secondary">
                          {photo.alt}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Photo Lightbox Modal */}
      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative w-full max-w-4xl border border-line-strong bg-bg-raised p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary text-body-l"
            >
              ✕
            </button>
            <img
              src={assetUrl(selectedPhoto)}
              alt={selectedPhoto.alt}
              className="max-h-96 w-full object-contain border border-line-hairline"
            />
            <p className="mt-4 text-body-m text-text-secondary">
              {selectedPhoto.alt}
            </p>
          </div>
        </div>
      ) : null}

      <footer className="border-t border-line-hairline py-8 text-center text-micro text-text-tertiary">
        BUET Robotics Society — Photo Archive
      </footer>
    </div>
  );
}
