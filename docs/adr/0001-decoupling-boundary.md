# ADR 0001 — The decoupling boundary is the schema plus a versioned contract

**Status** Accepted · **Date** 30 July 2026 · **Supersedes** `PROJECT_SPEC.md` §11 (Keystatic)

## Context

The client requires that the frontend be replaceable without touching the
backend: "if the frontend UI layer needs to be completely redesigned or
swapped out in the future, the core backend services must remain entirely
untouched and operational."

The obvious reading is "use a headless CMS." That is insufficient. Most
headless setups *move* coupling rather than remove it — pick a CMS with a
proprietary datastore and opaque response shapes, and you have exchanged a
frontend dependency for a vendor dependency. Replacing the frontend then
becomes easy while replacing the CMS means re-modelling all content.

There is also a second, unstated requirement implied by the client's
situation: the executive committee turns over annually, and there is no
on-call rotation.

## Decision

The decoupling boundary is **PostgreSQL plus a versioned API contract**, not
a CMS product.

1. **Postgres owns the data.** Schema versioned in git as SQL migrations
   (`packages/db`). Directus is a UI over *our* schema, not a black box
   holding content hostage.
2. **A stable DTO contract at `/v1/*`**, published as a semver'd TypeScript
   package (`@brs/contract`). Frontends import the package; they never learn
   CMS query syntax.
3. **Static delivery.** The site builds against the API and ships as static
   files. The backend is required for *authoring*, never for *serving*.

## Consequences

**Positive**

- Swap the frontend → Plane 4 only; Planes 1–3 are not even redeployed.
- Swap the CMS → Plane 2 plus one adapter file; the contract is unchanged
  and the frontend is unaware.
- **Backend downtime is invisible to the public.** For a student club with
  annual turnover, a site that cannot be taken down by backend failure is
  worth more than any feature.
- The Directus BSL licence changing (risk 10) becomes a UI replacement, not
  a content migration.

**Negative**

- More moving parts than flat files in the frontend repo.
- The façade is ~600 lines that would not otherwise exist. Justified because
  it converts an eventual CMS migration from months to days; if it is ever
  descoped, `@brs/content-client` must remain the frontend's only import
  surface so the seam survives.

**Enforcement**

`brs/no-direct-backend-import` fails the build if anything outside
`packages/contract`, `packages/db`, or `apps/api` imports a CMS SDK, reads
`DIRECTUS_*`, or fetches the CMS. A boundary that is not enforced
mechanically is a boundary that will be crossed.

## Alternatives rejected

| Option | Why not |
| --- | --- |
| Sanity / Contentful / Hygraph | Proprietary datastore — content hostage, the exact coupling being removed |
| Keystatic (flat files in repo) | Flat files *in the frontend repo* are the definition of coupling; replacing the frontend would mean migrating all content |
| Payload 3 embedded in Next | Couples the CMS to the frontend framework — precisely what the directive forbids |
| WordPress + REST | Maintenance and security burden across annual handover |
| Frontend calls Directus directly | Directus-isms (`?fields=`, `?deep=`, junction shapes) leak into every query |
