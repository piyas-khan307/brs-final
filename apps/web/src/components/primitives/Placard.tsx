/**
 * PLACARD — the museum wall label. §5.9.1.
 *
 * Applied consistently across every artifact on the site, this IS the visual
 * identity. Mono, uppercase, tracked, tabular figures.
 *
 * Note the plate number is rendered in a separate line from the metadata:
 * a placard reads as catalogue entry first, description second — the same
 * order a museum label uses.
 */

type PlacardProps = {
  plate?: number | null;
  lines?: readonly string[];
  className?: string;
};

export function Placard({ plate, lines = [], className = "" }: PlacardProps) {
  if (plate == null && lines.length === 0) return null;

  return (
    <figcaption className={`mt-4 ${className}`}>
      {plate != null ? (
        <span className="block font-mono text-micro uppercase text-text-secondary tabular">
          PL. {String(plate).padStart(3, "0")}
        </span>
      ) : null}
      {lines.map((line) => (
        <span
          key={line}
          className="mt-1 block font-mono text-micro uppercase text-text-tertiary tabular"
        >
          {line}
        </span>
      ))}
    </figcaption>
  );
}

/** Section eyebrow. Same register, used without an artifact. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-label uppercase text-text-tertiary tabular">
      {children}
    </span>
  );
}
