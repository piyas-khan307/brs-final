/**
 * THE RECORD — 2005 to 2026.
 *
 * VERIFICATION DISCIPLINE (§17.4, §16.2): `verified` is true for exactly one
 * entry. The Panasonic Award certificate is legible in
 * `BRS/Robocon/Team BUET, Robocon Panasonic Award 2005.jpg` — it reads
 * "ASIA-PACIFIC Robot Contest 2005 BEIJING / Panasonic AWARD", which is also
 * where the host city comes from; no filename records it.
 *
 * Every other entry states PARTICIPATION ONLY. `result: null` means
 * "competed, outcome not yet verified" — never "no award". Placements
 * require alumni outreach (§16.2), and inventing one would destroy the
 * credibility of the entire Record.
 *
 * Team names are taken from archive filenames, which are evidence but not
 * authority. NOTE the unresolved §16.3 ambiguity: the rover team appears as
 * "Interplanetar" in the club's own 2017 seminar copy and "Interplaneters"
 * in filenames. Prose written by the club is the stronger source, so
 * "Interplanetar" is used here pending confirmation.
 */

export type RecordEntry = {
  year: number;
  programme: string;
  host?: string;
  teams?: string;
  /** null = competed, outcome unverified. Never "no award". */
  result: string | null;
  verified: boolean;
  track: "international" | "hosted";
  /** Shown as a labelled anchor on the axis rather than a bare tick. */
  anchor?: boolean;
};

export const RECORD: readonly RecordEntry[] = [
  {
    year: 2005,
    programme: "ABU Asia-Pacific Robot Contest",
    host: "Beijing",
    teams: "Team BUET",
    result: "Panasonic Award",
    verified: true,
    track: "international",
    anchor: true,
  },
  { year: 2008, programme: "ABU Asia-Pacific Robot Contest", teams: "Team BUET", result: null, verified: false, track: "international" },
  { year: 2012, programme: "IRC", teams: "BUET SKULL", result: null, verified: false, track: "international", anchor: true },
  { year: 2013, programme: "IRC", teams: "ErfindeR · REX · Falcons", result: null, verified: false, track: "international" },
  {
    year: 2013,
    programme: "NASA Lunabotics",
    teams: "MechaTron",
    result: null,
    verified: false,
    track: "international",
    anchor: true,
  },
  { year: 2014, programme: "IRC", teams: "BUET Exponential", result: null, verified: false, track: "international" },
  { year: 2014, programme: "iARC · Techkriti", host: "IIT Kanpur", teams: "BUET Exponential", result: null, verified: false, track: "international" },
  { year: 2015, programme: "IRC", teams: "BUET Resonance", result: null, verified: false, track: "international" },
  {
    year: 2015,
    programme: "iARC · Techkriti",
    host: "IIT Kanpur",
    teams: "AC~DC · Exponential · Fireflies",
    result: null,
    verified: false,
    track: "international",
    anchor: true,
  },
  { year: 2015, programme: "European Rover Challenge", teams: "Team Interplanetar", result: null, verified: false, track: "international" },
  {
    year: 2016,
    programme: "University Rover Challenge",
    teams: "Team Interplanetar",
    result: null,
    verified: false,
    track: "international",
    anchor: true,
  },
  { year: 2016, programme: "Robo Carnival", host: "BUET premises", result: null, verified: false, track: "hosted" },
  { year: 2017, programme: "Robo Carnival", host: "BUET premises", result: null, verified: false, track: "hosted" },
  { year: 2019, programme: "Robo Carnival", host: "BUET premises", teams: "5 segments", result: null, verified: false, track: "hosted" },
  { year: 2022, programme: "Intra-BUET Robo Challenge", host: "BUET premises", result: null, verified: false, track: "hosted" },
  { year: 2023, programme: "Robo Carnival", host: "BUET premises", result: null, verified: false, track: "hosted" },
  {
    year: 2024,
    programme: "Robo Carnival",
    host: "BUET premises",
    teams: "6 segments",
    result: null,
    verified: false,
    track: "hosted",
    anchor: true,
  },
  { year: 2024, programme: "Intra-BUET Robo Challenge", host: "BUET premises", teams: "3 segments", result: null, verified: false, track: "hosted" },
];

export const RECORD_START = 2005;
export const RECORD_END = 2026;

/** Tick height is driven by how much happened that year — the axis reads as
 *  an instrument, not a decoration. */
export function densityByYear(): Map<number, number> {
  const m = new Map<number, number>();
  for (let y = RECORD_START; y <= RECORD_END; y++) m.set(y, 0);
  for (const e of RECORD) m.set(e.year, (m.get(e.year) ?? 0) + 1);
  return m;
}
