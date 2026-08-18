"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE PHOTOGRAPHS FROM ONE EVENT.
 *
 * A contact sheet with the same enlarged view the roster uses — click a
 * frame, arrow through the set, Escape to close. The behaviour was
 * argued once on the committee page and is repeated here rather than
 * reinvented: scroll locked while open, focus trapped and returned to
 * the tile that opened it, backdrop click closes, the photograph itself
 * does not.
 *
 * WITHOUT JAVASCRIPT: every photograph renders as a plain grid, at full
 * size, with its description. Only the enlargement stops working.
 * ══════════════════════════════════════════════════════════════════════
 */

import { forwardRef, useEffect, useRef, useState } from "react";

import type { EventImage } from "@/lib/events.generated";

const srcSet = (sources: { w: number; url: string }[]) =>
  sources.map((s) => `${s.url} ${s.w}w`).join(", ");

const SIZES = "(min-width: 1024px) 18rem, (min-width: 640px) 30vw, 45vw";

export function EventGallery({ images, title }: { images: EventImage[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : (images[openIndex] ?? null);

  return (
    <section className="mx-auto mt-24 max-w-content border-t border-line-strong pt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2
          className="font-display text-heading-l text-text-primary"
          style={{ fontVariationSettings: "'wght' 700" }}
        >
          Photographs
        </h2>
        <span className="font-mono text-micro uppercase tabular text-text-tertiary">
          {images.length} {images.length === 1 ? "frame" : "frames"}
        </span>
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={`${img.alt}-${i}`}>
            <button
              type="button"
              className="gallery-tile"
              onClick={() => setOpenIndex(i)}
              aria-label={`${img.alt} — view larger`}
            >
              <picture
                className="event-card__frame"
                style={{ aspectRatio: `${img.width} / ${img.height}` }}
              >
                <source type="image/avif" srcSet={srcSet(img.avif)} sizes={SIZES} />
                <source type="image/webp" srcSet={srcSet(img.webp)} sizes={SIZES} />
                <img
                  src={img.webp[img.webp.length - 1]?.url}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  sizes={SIZES}
                  loading="lazy"
                  decoding="async"
                  style={{
                    backgroundImage: `url("${img.lqip}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </picture>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <Lightbox
          image={open}
          title={title}
          position={(openIndex ?? 0) + 1}
          total={images.length}
          onClose={() => setOpenIndex(null)}
          onStep={(d) =>
            setOpenIndex((i) => (i === null ? null : (i + d + images.length) % images.length))
          }
        />
      ) : null}
    </section>
  );
}

function Lightbox({
  image,
  title,
  position,
  total,
  onClose,
  onStep,
}: {
  image: EventImage;
  title: string;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Fresh closures every render, and the parent re-renders on every arrow
  // press. Held in a ref so the effect below can run exactly once — see
  // the same note on the committee lightbox.
  const handlers = useRef({ onClose, onStep });
  useEffect(() => {
    handlers.current = { onClose, onStep };
  });

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") return handlers.current.onClose();
      if (e.key === "ArrowRight") return handlers.current.onStep(1);
      if (e.key === "ArrowLeft") return handlers.current.onStep(-1);
      if (e.key !== "Tab") return;

      const focusable = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnTo?.focus();
    };
    // Once, on open. Everything that changes is read through `handlers`.
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — photograph ${position} of ${total}`}
        className="flex max-h-full max-w-content flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <picture>
          <source type="image/avif" srcSet={srcSet(image.avif)} />
          <source type="image/webp" srcSet={srcSet(image.webp)} />
          <img
            src={image.webp[image.webp.length - 1]?.url}
            alt={image.alt}
            className="lightbox-image"
          />
        </picture>

        <div className="mt-6 flex w-full flex-wrap items-end justify-between gap-4">
          <p className="max-w-prose text-body-s text-mount-text">{image.alt}</p>
          <div className="flex items-center gap-2">
            <span className="mr-2 font-mono text-micro uppercase tabular text-mount-text">
              {String(position).padStart(2, "0")} / {total}
            </span>
            <GalleryButton onClick={() => onStep(-1)} label="Previous photograph">
              ←
            </GalleryButton>
            <GalleryButton onClick={() => onStep(1)} label="Next photograph">
              →
            </GalleryButton>
            <GalleryButton ref={closeButton} onClick={onClose} label="Close">
              ✕
            </GalleryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

const GalleryButton = forwardRef<
  HTMLButtonElement,
  { onClick: () => void; label: string; children: React.ReactNode }
>(function GalleryButton({ onClick, label, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border border-mount-line px-4 py-2 font-mono text-body-s text-mount-text transition-colors hover:border-accent hover:text-white"
    >
      {children}
    </button>
  );
});
