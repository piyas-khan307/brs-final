/**
 * Sheet 01 zone index.
 *
 * NOTE ON LETTERING: §4.2 sketched zones A-I including F for Team NUVOLA.
 * That zone is CUT — the archive holds exactly one unrenderable HEIC for
 * NUVOLA and §7.11 forbids shipping a stub (§16.4 is blocking). Rather than
 * leave a conspicuous gap in the rail, the remaining zones are relettered
 * sequentially A-F. Mapping is recorded in docs/LANDING_RATIONALE.md.
 */

export type Zone = { id: string; letter: string; label: string };

export const ZONES: readonly Zone[] = [
  { id: "zone-a", letter: "A", label: "Opening" },
  { id: "zone-b", letter: "B", label: "The Record" },
  { id: "zone-c", letter: "C", label: "What we build" },
  { id: "zone-d", letter: "D", label: "The Archive" },
  { id: "zone-e", letter: "E", label: "Partners & Press" },
  { id: "zone-f", letter: "F", label: "Apply" },
];
