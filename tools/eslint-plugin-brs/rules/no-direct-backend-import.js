/**
 * RULE 1 — no-direct-backend-import
 *
 * Nothing outside packages/contract may import a CMS SDK or fetch the CMS
 * directly. This is the rule that makes "swap the frontend, backend
 * untouched" true rather than aspirational (implementation_plan.md §7.4).
 *
 * A frontend that learns Directus query syntax (`?fields=`, `?deep=`) has
 * silently re-coupled itself, and replacing the CMS then means rewriting
 * every query. `@brs/content-client` is the only permitted data surface.
 */

const FORBIDDEN_MODULES = [
  "@directus/sdk",
  "directus",
  "@strapi/client",
  "@sanity/client",
  "next-sanity",
  "contentful",
  "@contentful/rich-text-react-renderer",
  "payload",
  "@payloadcms/next",
  "pg",
  "postgres",
  "drizzle-orm",
  "knex",
  "@prisma/client",
];

/** Env vars that only the façade should ever read. */
const FORBIDDEN_ENV = ["DIRECTUS_URL", "DIRECTUS_TOKEN", "DATABASE_URL"];

/** Paths permitted to touch the backend directly. */
const ALLOWED_PATH_FRAGMENTS = [
  "packages/contract",
  "packages/db",
  "packages/media",
  "packages/sync-sharepoint",
  "apps/api",
  "apps/cms",
  // The uploader. It is Plane 2, writes `assets` rows directly, and is the
  // one service holding storage write credentials — the very coupling this
  // rule protects the FRONTEND from is this service's entire job. It is
  // unroutable from outside; see apps/ingest/src/index.ts.
  "apps/ingest",
];

function isAllowed(filename) {
  const norm = filename.split("\\").join("/");
  return ALLOWED_PATH_FRAGMENTS.some((f) => norm.includes(f));
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid direct CMS/database access outside the contract and backend packages",
    },
    schema: [],
    messages: {
      forbiddenModule:
        "'{{name}}' may not be imported here. The frontend's only data surface is @brs/content-client (implementation_plan.md §7.4). Direct CMS access re-couples the layers this architecture exists to separate.",
      forbiddenEnv:
        "process.env.{{name}} is backend-only. The frontend may read NEXT_PUBLIC_BRS_API and nothing else (§7.4).",
      forbiddenFetch:
        "Do not fetch the CMS directly. Route through @brs/content-client so the CMS stays replaceable (§7.4).",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isAllowed(filename)) return {};

    function checkSource(node, raw) {
      if (typeof raw !== "string") return;
      const bare = raw.replace(/^node:/, "");
      if (FORBIDDEN_MODULES.some((m) => bare === m || bare.startsWith(`${m}/`))) {
        context.report({ node, messageId: "forbiddenModule", data: { name: raw } });
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },

      // require('...') and dynamic import('...')
      CallExpression(node) {
        const isRequire = node.callee.type === "Identifier" && node.callee.name === "require";
        const isDynamicImport = node.callee.type === "Import";
        if ((isRequire || isDynamicImport) && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg && arg.type === "Literal") checkSource(node, arg.value);
        }

        // fetch('http://localhost:8055/items/...') or any /items/ CMS path
        if (node.callee.type === "Identifier" && node.callee.name === "fetch") {
          const arg = node.arguments[0];
          if (arg && arg.type === "Literal" && typeof arg.value === "string") {
            if (/\/items\/|directus|:8055/i.test(arg.value)) {
              context.report({ node, messageId: "forbiddenFetch" });
            }
          }
        }
      },

      // process.env.DIRECTUS_TOKEN etc.
      MemberExpression(node) {
        if (
          node.object.type === "MemberExpression" &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "process" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env" &&
          node.property.type === "Identifier" &&
          FORBIDDEN_ENV.includes(node.property.name)
        ) {
          context.report({
            node,
            messageId: "forbiddenEnv",
            data: { name: node.property.name },
          });
        }
      },
    };
  },
};
