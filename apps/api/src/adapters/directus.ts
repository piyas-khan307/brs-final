/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ONLY CMS-AWARE FILE IN THE ENTIRE REPOSITORY.
 *
 * This is the internal adapter referenced in implementation_plan.md §6.1.
 * Every Directus-ism — `?fields=`, `?deep=`, junction-table shapes, `meta`
 * envelopes — is confined to this file and translated into the stable DTOs
 * from @brs/contract.
 *
 * WHY THIS MATTERS: if Directus is ever replaced (risk 10 — the BSL licence
 * could change), this file is rewritten and NOTHING else moves. The /v1
 * contract is unchanged, so the frontend never learns the CMS was swapped.
 * That is the difference between a migration measured in days and one
 * measured in months.
 *
 * RULE: no Directus type, field name, or query parameter may leak past this
 * module's exports. Lint rule `brs/no-direct-backend-import` permits CMS
 * imports here and nowhere outside apps/api and packages/*.
 * ══════════════════════════════════════════════════════════════════════
 */

import type { CommitteeDTO, EventDTO, ImageDTO, MemberDTO, StatsDTO } from "@brs/contract";

export type AdapterConfig = {
  directusUrl: string;
  directusToken: string;
  /** Public base of THIS façade — asset URLs are issued relative to it so
   *  storage stays swappable (§7.1 rule 5). */
  publicApiBase: string;
  fetch?: typeof globalThis.fetch;
};

/** Raw Directus row shapes. Deliberately local — never exported. */
type DxAsset = {
  id: string;
  storage_key: string;
  alt: string;
  width: number;
  height: number;
  lqip: string;
  ratio: ImageDTO["ratio"];
  credit?: string | null;
};

type DxMember = {
  id: string;
  name: string;
  department: string;
  batch: string;
  portrait_asset_id?: DxAsset | null;
  // NOTE: there is no contact field to destructure. The DB has no such
  // column (§12.1 control 1) and this adapter could not surface one.
};

export function createDirectusAdapter(cfg: AdapterConfig) {
  const doFetch = cfg.fetch ?? globalThis.fetch;
  const base = cfg.directusUrl.replace(/\/$/, "");

  // Phase B1 scaffolding: the single point at which Directus is spoken to.
  // Currently unreferenced because the read methods below are stubs.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function dx<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const res = await doFetch(url, {
      headers: { authorization: `Bearer ${cfg.directusToken}`, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Directus ${res.status} on ${path}`);
    // Directus wraps payloads in { data }. This envelope stops here.
    const json = (await res.json()) as { data: T };
    return json.data;
  }

  /** Translate a CMS asset row into a façade-issued ImageDTO. */
  function toImage(a: DxAsset | null | undefined): ImageDTO | undefined {
    if (!a) return undefined;
    return {
      id: a.id,
      // Never a storage-provider URL. Always ours.
      url: `${cfg.publicApiBase}/v1/assets/${a.id}`,
      alt: a.alt,
      width: a.width,
      height: a.height,
      lqip: a.lqip,
      ratio: a.ratio,
      ...(a.credit ? { credit: a.credit } : {}),
    };
  }

  function toMember(m: DxMember, committeeOrdinal: number, team?: string): MemberDTO {
    return {
      id: m.id,
      name: m.name,
      // `designation` arrives from the memberships join, supplied by caller.
      designation: "",
      department: m.department,
      batch: m.batch,
      committeeOrdinal,
      ...(team ? { team } : {}),
      ...(m.portrait_asset_id ? { portrait: toImage(m.portrait_asset_id) } : {}),
    };
  }

  return {
    toImage,
    toMember,

    /** Placeholder reads. Implemented in Phase B1 against the live schema. */
    async listEvents(): Promise<EventDTO[]> {
      throw new Error("Not implemented until Phase B1 — schema must be applied first.");
    },
    async listCommittees(): Promise<CommitteeDTO[]> {
      throw new Error("Not implemented until Phase B1.");
    },

    /**
     * Statistics are COMPUTED here, never stored and never hand-typed.
     * This function is the structural answer to §2.3: the prototype claimed
     * "480+ active members" (false — that is every roster row across seven
     * historical committees; the current one is ~52) and "10 executive
     * committees" (unsupported — seven are documented).
     */
    async computeStats(): Promise<StatsDTO> {
      throw new Error("Not implemented until Phase B1 — requires live counts.");
    },
  };
}

export type DirectusAdapter = ReturnType<typeof createDirectusAdapter>;
