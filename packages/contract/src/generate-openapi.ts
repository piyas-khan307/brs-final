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
  CollectionDTO,
  CollectionItemDTO,
  CommitteeDTO,
  EventDTO,
  ImageDTO,
  ImageSource,
  MemberDTO,
  PartnerDTO,
  PostDTO,
  PressDTO,
  ProjectDTO,
  StatsDTO,
  CONTRACT_VERSION,
} from "./schemas.js";

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  ImageSource,
  ImageDTO,
  CollectionItemDTO,
  CollectionDTO,
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
paths[`/${CONTRACT_VERSION}/stats`] = {
  get: {
    summary: "Computed statistics — the only source of figures on the site",
    responses: {
      ...ok({ $ref: "#/components/schemas/StatsDTO" }),
      // Documented, because a consumer that treats this as a transport
      // error will retry forever. It is a content state, not an outage:
      // earliestEvidenceYear cannot be computed with no events and no
      // achievements loaded, and inventing one is the §2.3 failure this
      // endpoint exists to prevent.
      "503": {
        description:
          "Insufficient evidence to compute statistics truthfully. Not an outage — " +
          "returns to 200 once events or achievements exist.",
      },
    },
  },
};

/* ── Routes the earlier revision of this generator omitted ────────────
 *
 * The document claimed 11 paths against a façade that serves 15. An
 * OpenAPI file is the artefact of record (§7.1 rule 4); one that
 * under-describes the surface is a lie by omission, and the four missing
 * entries were exactly the ones a consumer could not have guessed —
 * including /assets/{id}, which is the storage seam.
 */

paths[`/${CONTRACT_VERSION}/collections`] = {
  get: {
    summary: "List curated collections — the editorial layer",
    description:
      "A collection is a chosen sequence of images with their placard text. It is NOT " +
      "an event: an event happened on a date, a collection is an order somebody picked " +
      "for a page. Items carry a stable `key` naming a ROLE (\"hero-rc19\"), so " +
      "reordering a collection cannot silently change which photograph is the hero.",
    responses: ok({ type: "array", items: { $ref: "#/components/schemas/CollectionDTO" } }),
  },
};

paths[`/${CONTRACT_VERSION}/collections/{slug}`] = {
  get: {
    summary: "Collection by slug",
    parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
    responses: {
      ...ok({ $ref: "#/components/schemas/CollectionDTO" }),
      "404": { description: "No such collection" },
    },
  },
};

paths[`/${CONTRACT_VERSION}/health`] = {
  get: {
    summary: "Liveness, plus counts of records the façade deliberately excludes",
    responses: {
      "200": {
        description: "OK",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                ok: { type: "boolean" },
                version: { type: "string" },
                database: { type: "string", enum: ["up", "down"] },
                diagnostics: {
                  type: "object",
                  properties: {
                    eventsWithoutCover: { type: "integer" },
                    unpublishedAssets: { type: "integer" },
                    assets: { type: "integer" },
                  },
                },
              },
              required: ["ok", "version", "database"],
            },
          },
        },
      },
      "503": { description: "Database unreachable" },
    },
  },
};

paths[`/${CONTRACT_VERSION}/committees/{ordinal}`] = {
  get: {
    summary: "Committee by ordinal",
    parameters: [
      { name: "ordinal", in: "path", required: true, schema: { type: "integer" } },
    ],
    responses: {
      ...ok({ $ref: "#/components/schemas/CommitteeDTO" }),
      "400": { description: "Ordinal is not an integer" },
      "404": { description: "No such committee" },
    },
  },
};

paths[`/${CONTRACT_VERSION}/posts/{slug}`] = {
  get: {
    summary: "Post by slug",
    parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
    responses: {
      ...ok({ $ref: "#/components/schemas/PostDTO" }),
      "404": { description: "No such post" },
    },
  },
};

paths[`/${CONTRACT_VERSION}/assets/{id}`] = {
  get: {
    summary:
      "Redirect to the stored bytes. The stable, provider-agnostic entry point for an asset.",
    description:
      "Answers 302 to the object's public URL rather than proxying it, so the façade " +
      "never sits in the path of image traffic. Storage stays swappable because the " +
      "redirect target is built from STORAGE_PUBLIC_BASE_URL, not hardcoded. " +
      "Add ?describe to receive the ImageDTO instead of a redirect.",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      {
        name: "describe",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Present at any value: return the ImageDTO instead of redirecting.",
      },
    ],
    responses: {
      "200": {
        description: "ImageDTO (only when ?describe is present)",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/ImageDTO" } },
        },
      },
      "302": { description: "Redirect to object storage" },
      "400": { description: "Id is not a uuid" },
      "404": { description: "No such published asset" },
    },
  },
};

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
