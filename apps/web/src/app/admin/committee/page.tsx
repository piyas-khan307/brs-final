"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE COMMITTEE — the screen this whole admin panel was built for.
 *
 * In Directus, putting one person on a committee is three rows in three
 * tables, created in an order nobody guesses: a `members` row, then a
 * `committee_sections` row if that position does not exist yet, then a
 * `memberships` row joining them. Anyone who has not been shown will
 * either give up or, worse, create a duplicate person.
 *
 * Here it is one form: name, position, photograph. The three writes still
 * happen — the schema is unchanged and correct — they are just not the
 * user's problem.
 *
 *   Committee            11th Executive Committee
 *   └── Section          Standing Committee · Design Team
 *       └── Position     President · Treasurer · Member
 *           └── Person   with a photograph
 *
 * Sections and positions are rows, not a fixed list, so a new team or an
 * invented title needs no developer.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

import { PhotoPicker, assetUrl } from "@/components/admin/PhotoPicker";
import {
  Button,
  Card,
  ConfirmButton,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  useFlash,
} from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

type Committee = {
  id: string;
  ordinal: number;
  label: string;
  term_start: number | null;
  term_end: number | null;
  is_current: boolean;
};
type Group = { id: string; committee_id: string; name: string; note: string | null; sort_order: number };
type Section = { id: string; group_id: string; name: string; sort_order: number };
type Member = { id: string; name: string; portrait_asset_id: string | null };
type Membership = {
  id: string;
  member_id: string;
  committee_id: string;
  section_id: string | null;
  designation: string;
  sort_order: number;
};
type Asset = { id: string; storage_key: string; alt: string };

export default function CommitteePage() {
  const [committees, setCommittees] = useState<Committee[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [flash, setFlash] = useFlash();
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const reload = useCallback(
    async (committeeId: string) => {
      const [g, ms] = await Promise.all([
        items.list<Group>("committee_groups", {
          "filter[committee_id][_eq]": committeeId,
          sort: "sort_order",
          limit: -1,
        }),
        items.list<Membership>("memberships", {
          "filter[committee_id][_eq]": committeeId,
          sort: "sort_order",
          limit: -1,
        }),
      ]);
      setGroups(g);
      setMemberships(ms);

      const s = g.length
        ? await items.list<Section>("committee_sections", {
            "filter[group_id][_in]": g.map((x) => x.id).join(","),
            sort: "sort_order",
            limit: -1,
          })
        : [];
      setSections(s);

      const memberIds = [...new Set(ms.map((m) => m.member_id))];
      const people = memberIds.length
        ? await items.list<Member>("members", {
            "filter[id][_in]": memberIds.join(","),
            fields: "id,name,portrait_asset_id",
            limit: -1,
          })
        : [];
      setMembers(Object.fromEntries(people.map((p) => [p.id, p])));

      const assetIds = people.map((p) => p.portrait_asset_id).filter(Boolean) as string[];
      const a = assetIds.length
        ? await items.list<Asset>("assets", {
            "filter[id][_in]": assetIds.join(","),
            fields: "id,storage_key,alt",
            limit: -1,
          })
        : [];
      setAssets(Object.fromEntries(a.map((x) => [x.id, x])));
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const c = await items.list<Committee>("committees", { sort: "-ordinal", limit: -1 });
        setCommittees(c);
        const pick = c.find((x) => x.is_current) ?? c[0];
        if (pick) {
          setCurrent(pick.id);
          await reload(pick.id);
        }
      } catch (e) {
        setFlash({ tone: "error", text: (e as Error).message });
      } finally {
        setLoading(false);
      }
    })();
  }, [reload, setFlash]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      if (current) await reload(current);
      setFlash({ tone: "success", text: message });
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
    }
  };

  if (loading) return <Loading what="the committee" />;

  const committee = committees?.find((c) => c.id === current) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Committee"
        description="Sections, the positions inside them, and who holds each one. Add as many as you need — nothing here is fixed in advance."
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {committees && committees.length > 1 ? (
        <Field label="Which committee">
          <Select
            value={current ?? ""}
            onChange={async (e) => {
              setCurrent(e.target.value);
              await reload(e.target.value);
            }}
          >
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.is_current ? " (current)" : ""}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {!committee ? (
        <Empty>No committee exists yet.</Empty>
      ) : (
        <>
          <CommitteeDetails committee={committee} onSaved={(m) => act(async () => {}, m)} setFlash={setFlash} />

          {groups.length === 0 ? (
            <Empty>
              No sections yet. Add one — “Standing Committee” is usually first, then each team.
            </Empty>
          ) : null}

          {groups.map((group) => {
            const groupSections = sections.filter((s) => s.group_id === group.id);
            const count = memberships.filter((m) =>
              groupSections.some((s) => s.id === m.section_id),
            ).length;

            return (
              <section key={group.id} className="border border-line-hairline bg-bg-raised">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-hairline px-5 py-4">
                  <div>
                    <h2
                      className="text-heading-m text-text-primary"
                      style={{ fontVariationSettings: "'wght' 550" }}
                    >
                      {group.name}
                    </h2>
                    <p className="mt-0.5 text-body-s text-text-tertiary">
                      {count} {count === 1 ? "person" : "people"} · {groupSections.length} positions
                    </p>
                  </div>
                  <ConfirmButton
                    what={group.name}
                    onConfirm={() =>
                      act(
                        () => items.remove("committee_groups", group.id),
                        `Removed ${group.name}.`,
                      )
                    }
                  >
                    Remove section
                  </ConfirmButton>
                </div>

                <div className="divide-y divide-line-faint">
                  {groupSections.map((section) => {
                    const holders = memberships.filter((m) => m.section_id === section.id);
                    return (
                      <div key={section.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-mono text-label uppercase text-text-secondary">
                            {section.name}
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="quiet"
                              onClick={() => setAddingTo(addingTo === section.id ? null : section.id)}
                            >
                              {addingTo === section.id ? "Cancel" : "Add a person"}
                            </Button>
                            <ConfirmButton
                              what={`the ${section.name} position`}
                              onConfirm={() =>
                                act(
                                  () => items.remove("committee_sections", section.id),
                                  `Removed ${section.name}.`,
                                )
                              }
                            >
                              Remove
                            </ConfirmButton>
                          </div>
                        </div>

                        {holders.length === 0 ? (
                          <p className="mt-3 text-body-s text-text-tertiary">Nobody in this position yet.</p>
                        ) : (
                          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                            {holders.map((ms) => {
                              const person = members[ms.member_id];
                              const asset = person?.portrait_asset_id
                                ? assets[person.portrait_asset_id]
                                : undefined;
                              return (
                                <li key={ms.id}>
                                  {asset ? (
                                    <img
                                      src={assetUrl(asset)}
                                      alt=""
                                      className="aspect-square w-full border border-line-hairline object-cover"
                                    />
                                  ) : (
                                    <div className="flex aspect-square w-full items-center justify-center border border-dashed border-line-strong text-body-s text-text-tertiary">
                                      No photo
                                    </div>
                                  )}
                                  <p className="mt-2 text-body-s text-text-primary">
                                    {person?.name ?? "…"}
                                  </p>
                                  {ms.designation !== section.name ? (
                                    <p className="text-body-s text-text-tertiary">{ms.designation}</p>
                                  ) : null}
                                  <ConfirmButton
                                    what={person?.name ?? "this person"}
                                    className="mt-1"
                                    onConfirm={() =>
                                      act(
                                        () => items.remove("memberships", ms.id),
                                        `Removed ${person?.name ?? "member"} from ${section.name}.`,
                                      )
                                    }
                                  >
                                    Remove
                                  </ConfirmButton>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {addingTo === section.id ? (
                          <AddPerson
                            committeeId={committee.id}
                            section={section}
                            nextSort={holders.length}
                            onDone={async (msg) => {
                              setAddingTo(null);
                              await reload(committee.id);
                              setFlash({ tone: "success", text: msg });
                            }}
                            onError={(msg) => setFlash({ tone: "error", text: msg })}
                          />
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="px-5 py-4">
                    <AddNamed
                      label="Add a position"
                      placeholder="e.g. Deputy Head"
                      onAdd={(name) =>
                        act(
                          () =>
                            items.create("committee_sections", {
                              group_id: group.id,
                              name,
                              sort_order: groupSections.length,
                            }),
                          `Added ${name}.`,
                        )
                      }
                    />
                  </div>
                </div>
              </section>
            );
          })}

          <Card>
            <AddNamed
              label="Add a section"
              placeholder="e.g. Workshop Team"
              onAdd={(name) =>
                act(
                  () =>
                    items.create("committee_groups", {
                      committee_id: committee.id,
                      name,
                      sort_order: groups.length,
                    }),
                  `Added ${name}.`,
                )
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function AddNamed({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
      }}
    >
      <span className="min-w-56 flex-1">
        <Field label={label}>
          <Input value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)} />
        </Field>
      </span>
      <Button type="submit" variant="secondary" disabled={!name.trim()}>
        Add
      </Button>
    </form>
  );
}

/**
 * The whole point of this screen: one form, three writes.
 *
 * Existing people are offered first. Two students genuinely can share a
 * name, so this never merges automatically — it offers, and a human
 * decides. Silently reusing a `members` row would corrupt the alumni
 * record in a way nobody would notice for years.
 */
function AddPerson({
  committeeId,
  section,
  nextSort,
  onDone,
  onError,
}: {
  committeeId: string;
  section: Section;
  nextSort: number;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState(section.name);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Member[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Look for someone already on record as you type — this is what stops
  // the archive filling with duplicate people.
  useEffect(() => {
    const q = name.trim();
    if (q.length < 3) return setMatches([]);
    const t = setTimeout(() => {
      items
        .list<Member>("members", {
          "filter[name][_icontains]": q,
          fields: "id,name,portrait_asset_id",
          limit: 5,
        })
        .then(setMatches)
        .catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(t);
  }, [name]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const memberId =
        existingId ??
        (
          await items.create<Member>("members", {
            name: name.trim(),
            // department and batch stay null on purpose — see migration
            // 0007. Blank is a true answer; a guess is not.
            portrait_asset_id: assetId,
          })
        ).id;

      if (existingId && assetId) {
        await items.update("members", existingId, { portrait_asset_id: assetId });
      }

      await items.create("memberships", {
        member_id: memberId,
        committee_id: committeeId,
        section_id: section.id,
        designation: designation.trim() || section.name,
        sort_order: nextSort,
      });

      onDone(`${name.trim()} added as ${designation || section.name}.`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 border border-line-strong bg-bg-base p-4">
      <Field label="Full name" required hint="Exactly as it should appear on the website.">
        <Input
          value={name}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setExistingId(null);
          }}
        />
      </Field>

      {matches.length && !existingId ? (
        <Notice tone="info">
          Already on record — is it one of these? Choosing keeps their history across committees.
          <span className="mt-2 flex flex-wrap gap-2">
            {matches.map((m) => (
              <Button
                key={m.id}
                variant="secondary"
                onClick={() => {
                  setExistingId(m.id);
                  setName(m.name);
                }}
              >
                {m.name}
              </Button>
            ))}
          </span>
        </Notice>
      ) : null}

      {existingId ? (
        <Notice tone="success">
          Using the existing record for {name}.{" "}
          <button type="button" className="underline" onClick={() => setExistingId(null)}>
            No, this is a different person
          </button>
        </Notice>
      ) : null}

      <Field
        label="Title as printed"
        hint={`Usually just “${section.name}”. Change it for something like “Vice President (Technical)”.`}
      >
        <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </Field>

      <PhotoPicker label="Portrait" value={assetId} onChange={setAssetId} />

      <Button variant="primary" onClick={submit} busy={busy} disabled={!name.trim()}>
        Add to {section.name}
      </Button>
    </div>
  );
}

/** Committee-level details, including the term years the 11th is missing. */
function CommitteeDetails({
  committee,
  setFlash,
}: {
  committee: Committee;
  onSaved: (message: string) => void;
  setFlash: (f: { tone: "success" | "error"; text: string }) => void;
}) {
  const [start, setStart] = useState(committee.term_start?.toString() ?? "");
  const [end, setEnd] = useState(committee.term_end?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      {/* The hint sits above BOTH fields rather than inside the first.
          A hint inside one field of a row pushes its input down and
          leaves the pair visibly misaligned. */}
      <p className="mb-4 max-w-prose text-body-s text-text-secondary">
        Term years. Leave both empty if they are not recorded anywhere — blank is a true
        answer and a guess is not. Fill both or neither.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <span className="min-w-40 flex-1">
          <Field label="From">
            <Input
              inputMode="numeric"
              value={start}
              placeholder="2024"
              onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </span>
        <span className="min-w-40 flex-1">
          <Field label="To">
            <Input
              inputMode="numeric"
              value={end}
              placeholder="2025"
              onChange={(e) => setEnd(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </span>
        <Button
          variant="secondary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await items.update("committees", committee.id, {
                term_start: start ? Number(start) : null,
                term_end: end ? Number(end) : null,
              });
              setFlash({ tone: "success", text: "Term years saved." });
            } catch (e) {
              setFlash({ tone: "error", text: (e as Error).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}
