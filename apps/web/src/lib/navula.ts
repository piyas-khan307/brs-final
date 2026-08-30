/**
 * ══════════════════════════════════════════════════════════════════════
 * TEAM NAVULA — THE CONTENT BLOCK.
 *
 * THIS IS THE ONLY FILE ANYONE NEEDS TO EDIT TO FINISH THE PAGE.
 *
 * Every word, figure, name and photograph on /teams/navula comes from
 * here. The components under components/navula/ contain layout and
 * choreography and no content whatsoever, which is what makes the page
 * finishable by someone who does not read TypeScript: find the field,
 * replace the placeholder, save.
 *
 * ── WHAT NAVULA IS, AND WHY THE PAGE IS SHAPED THIS WAY ───────────────
 * Per the club: Navula is a SPECIALISED TEAM within BRS that represents
 * the Society at every competition it enters, national and
 * international. It has a leader, and it has standing rules.
 *
 * That is a competition squad, not a build team, and the difference
 * decides the whole structure:
 *
 *   · A build team has ONE machine, so its page is organised around
 *     subsystems — mechanical, electrical, software. Navula fields
 *     whatever a given competition requires, so machines belong to
 *     CAMPAIGNS (see `record`) rather than to a standing org chart.
 *   · A squad that represents an institution is defined by its MANDATE
 *     and its ROLES. Those are §03 and §05, and they exist because the
 *     club named them: "it has a leader and other rules in this team."
 *   · What such a team is FOR is the record. §06 is therefore the
 *     climax of the page rather than a list near the bottom.
 *
 * NOT `.generated`. Hardcoded on instruction, matching how the motion
 * sheet was built. When the club wants to edit this from /admin the
 * shapes below become the DTO and this file becomes navula.generated.ts;
 * nothing in components/navula/ would need touching. That is the reason
 * the shapes are declared rather than inferred.
 *
 * ── THE PLACEHOLDER RULE ──────────────────────────────────────────────
 * No figure on this page is invented. Nothing in the repository, in
 * BRS/, or in the archive names Navula, so there is nothing to draw on
 * and guessing a founding year or a placing would put fiction on a page
 * whose entire argument is that its numbers hold up.
 *
 * So every unknown is written as PENDING — a single em-rule — and the
 * components render it as one. An archive register marks an unrecorded
 * field with a rule rather than leaving it blank, so the page reads as
 * an accession record awaiting entry instead of as a broken layout.
 *
 * A FEW FIELDS ARE MARKED `DRAFTED`. Those are sentences written from
 * the club's own description of Navula rather than invented — they say
 * something the club has already said, in this page's register. They
 * still need a human to confirm the wording; they are marked so nobody
 * has to guess which is which.
 *
 * DRAFT below is what makes all of it visible. While it is true the page
 * carries a ribbon saying so. Set it to false once the fields are real.
 * ══════════════════════════════════════════════════════════════════════
 */

/** Flip to false when the fields below are the club's own facts. */
export const DRAFT = true;

/** The em-rule. An unrecorded field, rendered as one. */
export const PENDING = "—";

/**
 * A photograph. `src` is a path under public/ — put Navula's images in
 * public/navula/ and point at them here.
 *
 * src: null renders an empty mount carrying its plate number and a mono
 * legend. That is deliberate and not a broken-image state: a hung frame
 * with no print in it is a legible object in this design system, and it
 * shows the club exactly which photographs the page is waiting for.
 *
 * width/height are ALWAYS required when src is set — they are what keeps
 * CLS at zero, and the page letterboxes the image inside its mount
 * rather than cropping it, so any aspect ratio is safe to supply.
 */
export type NavulaPhoto = {
  src: string | null;
  alt: string;
  width: number;
  height: number;
};

/** No photograph supplied yet. */
export const noPhoto = (alt: string): NavulaPhoto => ({
  src: null,
  alt,
  width: 1600,
  height: 1067,
});

/** §03 — one clause of the standing rules. */
export type Clause = {
  /** What the clause governs. Three or four words, mono. */
  heading: string;
  /** The rule itself. One sentence, stated as a rule and not as a hope. */
  text: string;
};

/** §04 — one annotated part of the flagship machine. */
export type Callout = {
  /** Plate number. Rendered as PL. 001. */
  plate: number;
  /** What the part is called. Two or three words. */
  part: string;
  /** One measured fact about it. A mass, a count, a rating, a range. */
  spec: string;
  /** Where the leader line lands, as a percentage of the photograph. */
  at: { x: number; y: number };
  /** Which side the placard sits on. Keeps lines from crossing. */
  side: "left" | "right";
  /** Vertical position of the placard itself, as a percentage. */
  label: number;
};

/** §05 — one role in the squad. */
export type Role = {
  code: string;
  name: string;
  /** The one-line answer to "what is this person responsible for". */
  brief: string;
  /** Two to four measured facts. Rendered as a mono definition list. */
  specs: readonly { key: string; value: string }[];
  /** Longer copy, revealed when the row is opened. Sixty words is plenty. */
  detail: string;
  photo: NavulaPhoto;
};

/** §06 — one campaign on the record. */
export type Campaign = {
  year: string;
  /** The competition, written the way the organisers write it. */
  event: string;
  /**
   * National or International. The club named this distinction
   * explicitly, so the page carries it as a field rather than leaving a
   * reader to infer it from a city name.
   */
  scope: "National" | "International" | typeof PENDING;
  /** Where it was held. */
  place: string;
  /** What Navula entered. Machines belong to campaigns, not to a roster. */
  machine: string;
  /** The result. PENDING until someone confirms it against a certificate. */
  result: string;
  /** One sentence. What actually happened, not how it felt. */
  note: string;
  photo: NavulaPhoto;
};

/** §07 — one member of the squad. */
export type SquadMember = {
  name: string;
  /** Their title within the team. */
  title: string;
  /** Must match a Role.code below, or "LEAD". */
  role: string;
  /** Optional. Where they went afterwards — the strongest line on the page. */
  since: string | null;
  photo: NavulaPhoto;
};

/** §08 — one step in getting into the team. */
export type SelectionStep = {
  /** What this stage is called. */
  stage: string;
  /** What actually happens at it, and what it filters for. */
  detail: string;
};

export const NAVULA = {
  /* ── §01 NAMEPLATE ──────────────────────────────────────────────────
     The mono rail under the name. Five fields, no more — a nameplate
     that lists eight things is a paragraph.

     `contested` is NOT typed here. It is computed from `record` below,
     because a hand-typed competition count is exactly the figure that
     goes stale the year nobody remembers to update it. */
  name: "Navula",
  /** What kind of team this is. */
  kind: "Competition team",
  /** Founding year. A number, not a range. */
  founded: PENDING,
  /** The current leader's name. The club named this role specifically. */
  leader: PENDING,
  parent: "BUET Robotics Society",

  /* ── §02 PURPOSE ────────────────────────────────────────────────────
     ONE sentence, split at its own clause boundaries. Three to five
     clauses; the section reveals them one at a time and indexes them in
     the margin.

     DRAFTED from the club's own description — "a specialized team in BRS
     who represent and participate all competition national or
     internationally" — rather than invented. Confirm the wording or
     replace it; the shape is right either way.

     The constraint is the point. A team that cannot say why it exists in
     forty words has not decided yet, and four paragraphs of mission copy
     is how that gets hidden.

     Test every clause against the house rule: if it reads true for any
     other robotics team, it carries no information. Delete it. */
  purpose: [
    "Navula is the team the Society sends.",
    "Every competition BRS enters is contested by this squad,",
    "at home and abroad,",
    "under a leader and a standing set of rules.",
  ],

  /* ── §03 THE MANDATE ────────────────────────────────────────────────
     The standing rules. The club said Navula "has a leader and other
     rules"; this is where those live, and it is the section that makes
     Navula read as an institution rather than as a group of friends who
     enter things.

     Write them AS RULES. "The team is led by one member, elected
     annually" is a rule. "We believe in strong leadership" is not, and
     the house copy rule will reject it on sight.

     The first two below are DRAFTED from what the club has already
     stated. The rest are the ones only the club can write. */
  mandate: [
    {
      heading: "Representation",
      text: "Navula represents the BUET Robotics Society at every competition the Society enters, national and international.",
    },
    {
      heading: "Leadership",
      text: "The team is led by one member, who is answerable to the Executive Committee for the team's conduct and results.",
    },
    {
      heading: "Membership",
      text: PENDING,
    },
    {
      heading: "Selection",
      text: PENDING,
    },
    {
      heading: "Conduct",
      text: PENDING,
    },
  ] as readonly Clause[],

  /* ── §04 THE FLAGSHIP ───────────────────────────────────────────────
     One machine, annotated. OPTIONAL: set `flagship` to null and the
     section disappears from the page entirely.

     It is optional because Navula is a squad rather than a build team —
     it fields whatever a given competition needs, and those machines are
     recorded against their campaigns in `record` below. This section
     exists for the case where the team has one machine it wants shown
     large and explained: the current entry, or the one it is known for.

     `at` is where the leader line lands — put it on the actual part.
     `label` is how far down the placard sits. Keep the left-side and
     right-side placards in ascending `label` order and the lines will
     never cross. */
  flagship: {
    /** What this machine is called, and what it was built for. */
    designation: PENDING,
    builtFor: PENDING,
    photo: noPhoto("Navula's current machine, complete."),
    callouts: [
      {
        plate: 1,
        part: "Drive",
        spec: PENDING,
        at: { x: 30, y: 68 },
        side: "left",
        label: 22,
      },
      {
        plate: 2,
        part: "Chassis",
        spec: PENDING,
        at: { x: 46, y: 46 },
        side: "left",
        label: 58,
      },
      {
        plate: 3,
        part: "Manipulator",
        spec: PENDING,
        at: { x: 62, y: 28 },
        side: "right",
        label: 20,
      },
      {
        plate: 4,
        part: "Sensing",
        spec: PENDING,
        at: { x: 72, y: 56 },
        side: "right",
        label: 56,
      },
      {
        plate: 5,
        part: "Power",
        spec: PENDING,
        at: { x: 52, y: 78 },
        side: "right",
        label: 84,
      },
    ] as readonly Callout[],
  },

  /* ── §05 THE ROLES ──────────────────────────────────────────────────
     The register: who does what inside the team, starting with the
     leader. This replaced a list of engineering subsystems, which was
     the wrong model — subsystems describe a machine, and Navula is a
     team that fields many machines.

     The codes are placeholders for the club's own role names. If Navula
     calls its second-in-command something specific, use that word; the
     register is more convincing the less generic the vocabulary is.

     `specs` is where the page earns credibility. Real counts, real
     terms of office. If a value is not settled yet, leave it PENDING —
     an em-rule in a register is normal and an invented figure is not. */
  roles: [
    {
      code: "LEAD",
      name: "Team Leader",
      brief: "Answerable for the team's conduct, entries and results.",
      specs: [
        { key: "Held by", value: PENDING },
        { key: "Term", value: PENDING },
      ],
      detail:
        "What the leader decides, what they are accountable for, and how they are chosen. Sixty words. Replace this.",
      photo: noPhoto("The team leader at a competition."),
    },
    {
      code: "DEP",
      name: "Deputy",
      brief: "Stands in for the leader and runs the team day to day.",
      specs: [
        { key: "Held by", value: PENDING },
        { key: "Term", value: PENDING },
      ],
      detail:
        "What this role is responsible for and what it decides on its own. Sixty words. Replace this.",
      photo: noPhoto("The deputy at work."),
    },
    {
      code: "TECH",
      name: "Technical",
      brief: "The build: design, fabrication and testing of the entry.",
      specs: [
        { key: "Members", value: PENDING },
        { key: "Covers", value: PENDING },
      ],
      detail:
        "What this group is responsible for across a campaign, from design review to the last test before shipping. Sixty words. Replace this.",
      photo: noPhoto("The technical group during a build."),
    },
    {
      code: "OPS",
      name: "Operations",
      brief: "Entries, travel, documentation and getting the team there.",
      specs: [
        { key: "Members", value: PENDING },
        { key: "Covers", value: PENDING },
      ],
      detail:
        "Registration deadlines, visas, freight, and the paperwork every international entry turns out to need. Sixty words. Replace this.",
      photo: noPhoto("Operations: the team's equipment being packed."),
    },
  ] as readonly Role[],

  /* ── §06 THE RECORD — THE CENTREPIECE ───────────────────────────────
     Newest first. This is what the team is FOR, and it is the section
     the whole page builds toward.

     Every result must be checkable against a certificate, a scoreboard,
     or an organiser's published table — the same standard /achievements
     holds. A placing nobody can verify stays PENDING.

     `scope` carries the national/international distinction the club
     named explicitly, so a reader does not have to infer it from a city.

     A NOTE ON THE BRS ARCHIVE: BRS/ holds material from Robocon, IRC,
     iARC, NASA Lunabotics, the rover challenges and the national
     contests, under per-entry team names — BUET Interplaneters, Team
     Bangladesh, BUET AC~DC, BUET Resonance, MechaTron. Whether those
     campaigns belong to Navula's record or predate the team is a
     question only the club can answer, so NONE of them have been copied
     in here. Adding them would be the single easiest way to put a false
     claim on this page. */
  record: [
    {
      year: PENDING,
      event: "Competition name",
      scope: PENDING,
      place: "City, country",
      machine: PENDING,
      result: PENDING,
      note: "One sentence on what happened. Not how it felt.",
      photo: noPhoto("Team Navula at a competition."),
    },
    {
      year: PENDING,
      event: "Competition name",
      scope: PENDING,
      place: "City, country",
      machine: PENDING,
      result: PENDING,
      note: "One sentence on what happened. Not how it felt.",
      photo: noPhoto("Team Navula at a competition."),
    },
    {
      year: PENDING,
      event: "Competition name",
      scope: PENDING,
      place: "City, country",
      machine: PENDING,
      result: PENDING,
      note: "One sentence on what happened. Not how it felt.",
      photo: noPhoto("Team Navula at a competition."),
    },
    {
      year: PENDING,
      event: "Competition name",
      scope: PENDING,
      place: "City, country",
      machine: PENDING,
      result: PENDING,
      note: "One sentence on what happened. Not how it felt.",
      photo: noPhoto("Team Navula at a competition."),
    },
  ] as readonly Campaign[],

  /* ── §07 THE SQUAD ──────────────────────────────────────────────────
     Grouped by role, never alphabetically, with the leader alone at the
     top. Grouping is the argument: it proves the roles in §05 describe
     real named people.

     `since` is optional and it is the single most persuasive line
     available to a recruitment page. Fill it in for the alumni you can
     confirm and leave it null for the rest. */
  squad: [
    {
      name: "Team leader",
      title: "Leader",
      role: "LEAD",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Deputy",
      role: "DEP",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Title",
      role: "TECH",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Title",
      role: "TECH",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Title",
      role: "TECH",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Title",
      role: "OPS",
      since: null,
      photo: noPhoto("Portrait."),
    },
    {
      name: "Member name",
      title: "Title",
      role: "OPS",
      since: null,
      photo: noPhoto("Portrait."),
    },
  ] as readonly SquadMember[],

  /* ── §08 SELECTION ──────────────────────────────────────────────────
     How a BRS member gets into Navula.

     This replaced a build log, which assumed a team that builds one
     machine over one season. For a squad that is SELECTED — the club's
     own word was "specialised" — the process of getting in is both the
     more truthful content and the strongest recruitment argument on the
     site, because it is the one thing a reader cannot find out any other
     way.

     Delete the section by emptying the array if the process is informal.
     An invented selection process would be worse than none. */
  selection: [
    { stage: "Stage name", detail: "What happens here, and what it filters for." },
    { stage: "Stage name", detail: "What happens here, and what it filters for." },
    { stage: "Stage name", detail: "What happens here, and what it filters for." },
  ] as readonly SelectionStep[],

  /* ── §09 CLOSE ──────────────────────────────────────────────────────
     Two actions, indexed. Never a filled pill (§17.1). */
  actions: [
    { index: "01", label: "Apply to Navula", href: "/explore/join" },
    { index: "02", label: "Read the record", href: "/achievements" },
  ],
} as const;

/** Role lookup for §07's grouping. */
export const ROLE_BY_CODE = new Map<string, Role>(
  NAVULA.roles.map((r) => [r.code, r]),
);
