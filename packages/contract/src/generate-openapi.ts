/**
 * Generates openapi.json from the Zod schemas.
 *
 * The OpenAPI document is the artefact of record (§7.1 rule 4) and it is
 * GENERATED, never hand-maintained — schema and documentation cannot drift.
 *
 * CI diffs this file between commits and fails on a breaking change within
 * a version: additive-only is the rule (§7.1 rule 3).
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  AchievementDTO,
  CommitteeDTO,
  EventDTO,
  ImageDTO,
  MemberDTO,
  PartnerDTO,
  PostDTO,
  PressDTO,
  ProjectDTO,
  StatsDTO,
  CONTRACT_VERSION,
} from "./schemas.js";

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  ImageDTO,
  EventDTO,
  MemberDTO,
  CommitteeDTO,
  AchievementDTO,
  ProjectDTO,
  PostDTO,
  PartnerDTO,
  PressDTO,
  StatsDTO,
};

const components: Record<string, unknown> = {};
for (const [name, schema] of Object.entries(SCHEMAS)) {
  components[name] = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" });
}

const paths: Record<string, unknown> = {};
const listOf = (ref: string) => ({
  type: "object",
  properties: {
    data: { type: "array", items: { $ref: `#/components/schemas/${ref}` } },
    nextCursor: { type: ["string", "null"] },
    total: { type: "integer" },
  },
  required: ["data", "nextCursor", "total"],
});

const ok = (schema: unknown) => ({
  "200": { description: "OK", content: { "application/json": { schema } } },
});

paths[`/${CONTRACT_VERSION}/events`] = { get: { summary: "List events", responses: ok(listOf("EventDTO")) } };
paths[`/${CONTRACT_VERSION}/events/{slug}`] = { get: { summary: "Event by slug", responses: ok({ $ref: "#/components/schemas/EventDTO" }) } };
paths[`/${CONTRACT_VERSION}/committees`] = { get: { summary: "List committees", responses: ok({ type: "array", items: { $ref: "#/components/schemas/CommitteeDTO" } }) } };
paths[`/${CONTRACT_VERSION}/members`] = { get: { summary: "List members (never includes contact data — §12.1)", responses: ok(listOf("MemberDTO")) } };
paths[`/${CONTRACT_VERSION}/achievements`] = { get: { summary: "List achievements", responses: ok({ type: "array", items: { $ref: "#/components/schemas/AchievementDTO" } }) } };
paths[`/${CONTRACT_VERSION}/projects/{slug}`] = { get: { summary: "Project by slug", responses: ok({ $ref: "#/components/schemas/ProjectDTO" }) } };
paths[`/${CONTRACT_VERSION}/posts`] = { get: { summary: "List posts", responses: ok(listOf("PostDTO")) } };
paths[`/${CONTRACT_VERSION}/partners`] = { get: { summary: "List partners", responses: ok({ type: "array", items: { $ref: "#/components/schemas/PartnerDTO" } }) } };
paths[`/${CONTRACT_VERSION}/press`] = { get: { summary: "List press coverage", responses: ok({ type: "array", items: { $ref: "#/components/schemas/PressDTO" } }) } };
paths[`/${CONTRACT_VERSION}/gallery`] = { get: { summary: "List gallery images", responses: ok(listOf("ImageDTO")) } };
paths[`/${CONTRACT_VERSION}/stats`] = { get: { summary: "Computed statistics — the only source of figures on the site", responses: ok({ $ref: "#/components/schemas/StatsDTO" }) } };

const doc = {
  openapi: "3.1.0",
  info: {
    title: "BRS Content API",
    version: "1.0.0",
    description:
      "The BRS content contract. Frontend-agnostic DTOs. Additive-only within a version; " +
      "breaking changes ship as /v2 with /v1 retained for >= 6 months. " +
      "MemberDTO deliberately has no contact field (implementation_plan.md §12.1).",
  },
  servers: [{ url: "https://api.example.invalid", description: "Set at deploy time" }],
  paths,
  components: { schemas: components },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "openapi.json");
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(`openapi.json written — ${Object.keys(components).length} schemas, ${Object.keys(paths).length} paths`);
