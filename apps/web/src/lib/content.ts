/**
 * The frontend's ONLY data surface — implementation_plan.md §7.4.
 *
 * Every page imports from here. Nothing in apps/web may import a CMS SDK,
 * read DIRECTUS_*, or fetch the CMS directly; lint rule
 * `brs/no-direct-backend-import` fails the build if it tries.
 *
 * This indirection is what makes "replace the frontend, backend untouched"
 * true rather than aspirational. It is also what makes the reverse true: if
 * Directus is swapped, this file does not change.
 */

import { createClient } from "@brs/contract";

const baseUrl = process.env.NEXT_PUBLIC_BRS_API ?? "http://localhost:8787";

export const brs = createClient({
  baseUrl,
  // Static export reads at build time, so bypass the edge cache (§7.5).
  bypassCache: true,
});

export type { EventDTO, CommitteeDTO, MemberDTO, StatsDTO, ImageDTO } from "@brs/contract";
