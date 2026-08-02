/**
 * ══════════════════════════════════════════════════════════════════════
 * @brs/contract/client — the contract made executable.
 *
 * This is the ONLY data surface any frontend may import (§7.4). A
 * replacement frontend installs this and is immediately correct. A frontend
 * that bypasses it and calls Directus directly has broken the architecture
 * — enforced by lint rule `brs/no-direct-backend-import`.
 *
 * Deliberately dependency-free beyond zod: no axios, no react-query, no
 * SWR. It runs at BUILD time in a static export, so there is no cache
 * layer, no retry policy, and no client runtime to ship.
 * ══════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import {
  AchievementDTO,
  CollectionDTO,
  CommitteeDTO,
  EventDTO,
  ImageDTO,
  MemberDTO,
  Paginated,
  PartnerDTO,
  PostDTO,
  PressDTO,
  ProjectDTO,
  StatsDTO,
  CONTRACT_VERSION,
} from "./schemas.js";

export type ClientOptions = {
  /** Façade base URL. The only backend coordinate a frontend knows. */
  baseUrl: string;
  version?: typeof CONTRACT_VERSION;
  /** Injected for tests; defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Build-time reads bypass the edge cache (§7.5). */
  bypassCache?: boolean;
};

export class ContractError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly path?: string,
  ) {
    super(message);
    this.name = "ContractError";
  }
}

type Query = Record<string, string | number | boolean | undefined>;

export function createClient(opts: ClientOptions) {
  const version = opts.version ?? CONTRACT_VERSION;
  const doFetch = opts.fetch ?? globalThis.fetch;
  const base = opts.baseUrl.replace(/\/$/, "");

  async function get<S extends z.ZodTypeAny>(
    path: string,
    schema: S,
    query?: Query,
  ): Promise<z.infer<S>> {
    const url = new URL(`${base}/${version}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const res = await doFetch(url, {
      headers: {
        accept: "application/json",
        ...(opts.bypassCache ? { "cache-control": "no-cache" } : {}),
      },
    });

    if (!res.ok) {
      throw new ContractError(
        `Contract request failed: ${res.status} ${res.statusText}`,
        res.status,
        url.pathname,
      );
    }

    const json = await res.json();

    // Validate at the boundary. A contract that is not enforced at runtime
    // is documentation, and documentation drifts.
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ContractError(
        `Contract violation at ${url.pathname}: ${JSON.stringify(
          parsed.error.issues.slice(0, 3),
        )}`,
        undefined,
        url.pathname,
      );
    }
    return parsed.data;
  }

  return {
    version,

    events: {
      list: (q?: {
        category?: string;
        year?: number;
        series?: string;
        featured?: boolean;
        limit?: number;
        cursor?: string;
      }) => get("/events", Paginated(EventDTO), q),
      bySlug: (slug: string) => get(`/events/${slug}`, EventDTO),
    },

    committees: {
      list: () => get("/committees", z.array(CommitteeDTO)),
      byOrdinal: (ordinal: number) => get(`/committees/${ordinal}`, CommitteeDTO),
      current: () => get("/committees", z.array(CommitteeDTO), { current: true }),
    },

    members: {
      list: (q?: {
        committee?: number;
        team?: string;
        department?: string;
        batch?: string;
        q?: string;
        limit?: number;
        cursor?: string;
      }) => get("/members", Paginated(MemberDTO), q),
    },

    achievements: {
      list: (q?: { track?: string; from?: number; to?: number }) =>
        get("/achievements", z.array(AchievementDTO), q),
    },

    projects: {
      bySlug: (slug: string) => get(`/projects/${slug}`, ProjectDTO),
    },

    posts: {
      list: (q?: { tag?: string; limit?: number; cursor?: string }) =>
        get("/posts", Paginated(PostDTO), q),
      bySlug: (slug: string) => get(`/posts/${slug}`, PostDTO),
    },

    partners: { list: () => get("/partners", z.array(PartnerDTO)) },
    press: { list: () => get("/press", z.array(PressDTO)) },

    gallery: {
      list: (q?: { event?: string; year?: number; limit?: number; cursor?: string }) =>
        get("/gallery", Paginated(ImageDTO), q),
    },

    /** Curated sequences with placard text. §B4 — the editorial layer. */
    collections: {
      list: () => get("/collections", z.array(CollectionDTO)),
      bySlug: (slug: string) => get(`/collections/${slug}`, CollectionDTO),
    },

    /** Every figure on the site comes from here. Never hand-typed (§2.3). */
    stats: () => get("/stats", StatsDTO),

    health: () => get("/health", z.object({ ok: z.boolean(), version: z.string() })),
  };
}

export type BrsClient = ReturnType<typeof createClient>;
