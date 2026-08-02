/**
 * ══════════════════════════════════════════════════════════════════════
 * APPLY THE ADMIN PANEL CONFIGURATION.
 *
 *   pnpm --filter @brs/cms configure:dry     # show what would change
 *   pnpm --filter @brs/cms configure         # apply it
 *
 * ── WHY THIS IS A SCRIPT AND NOT AN AFTERNOON OF CLICKING ──
 * Every setting here — a collection's name, a note explaining the alt-text
 * rule, the Member role's exact permissions — is a decision. Made in the
 * Directus UI, those decisions live only in a database nobody backs up
 * with the code, cannot be reviewed, and are gone the moment someone runs
 * `docker compose down -v`. Made here, they are diffable, reversible and
 * reproducible on a fresh machine in ten seconds.
 *
 * It is IDEMPOTENT. Run it as often as you like; it patches what differs
 * and leaves the rest alone.
 *
 * ── WHAT IT WILL NOT DO ──
 * It never creates, alters or drops a TABLE. Structure belongs to the
 * migrations in packages/db, and Directus is a presentation layer over
 * them (§7.1). If a collection in model.mjs has no table, this reports it
 * and moves on rather than helpfully inventing one.
 * ══════════════════════════════════════════════════════════════════════
 */

import { COLLECTIONS, FIELDS, FOLDERS, MEMBER_ACCESS } from "./model.mjs";

const URL_BASE = (process.env.DIRECTUS_URL ?? "http://localhost:8055").replace(/\/+$/, "");
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "dev-only-change-me";
const DRY = process.argv.includes("--dry-run");

let token = process.env.DIRECTUS_TOKEN ?? "";
const changes = [];

async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = body.errors?.map((e) => e.message).join("; ") ?? text.slice(0, 200);
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${detail}`);
  }
  return body.data;
}

const record = (what) => {
  changes.push(what);
  console.log(`  ${DRY ? "would" : "did "}  ${what}`);
};

/* ── Authenticate ─────────────────────────────────────────────────────── */

async function login() {
  if (token) return;
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  token = data.access_token;
}

/* ── Folders ──────────────────────────────────────────────────────────── */

/**
 * A folder in Directus is a collection row with no table behind it
 * (`schema: null`). That is why these cannot be created by a migration —
 * they are pure UI, and they are the difference between a sidebar and a
 * list of 21 table names.
 */
async function ensureFolders(existing) {
  for (const [i, f] of FOLDERS.entries()) {
    const found = existing.find((c) => c.collection === f.name);
    const meta = {
      icon: f.icon,
      translations: [{ language: "en-US", translation: f.label, singular: f.label, plural: f.label }],
      sort: i + 1,
      collapse: "open",
    };
    if (!found) {
      record(`create folder "${f.label}"`);
      if (!DRY) await api("/collections", {
        method: "POST",
        body: JSON.stringify({ collection: f.name, schema: null, meta }),
      });
    } else if (found.meta?.icon !== f.icon || found.meta?.sort !== i + 1) {
      record(`update folder "${f.label}"`);
      if (!DRY) await api(`/collections/${f.name}`, { method: "PATCH", body: JSON.stringify({ meta }) });
    }
  }
}

/* ── Collections ──────────────────────────────────────────────────────── */

async function configureCollections(existing) {
  const byName = new Map(existing.map((c) => [c.collection, c]));
  const configured = new Set();

  for (const [i, c] of COLLECTIONS.entries()) {
    configured.add(c.name);
    const found = byName.get(c.name);
    if (!found) {
      console.log(`  ⚠ skip  "${c.name}" — model.mjs names it but no such table exists`);
      continue;
    }

    const meta = {
      icon: c.icon,
      note: c.note ?? null,
      hidden: c.hidden ?? false,
      group: c.folder,
      sort: i + 1,
      translations: [
        {
          language: "en-US",
          translation: c.label,
          singular: c.singular ?? c.label,
          plural: c.label,
        },
      ],
    };

    const current = found.meta ?? {};
    const same =
      current.icon === meta.icon &&
      (current.note ?? null) === meta.note &&
      Boolean(current.hidden) === meta.hidden &&
      (current.group ?? null) === meta.group &&
      current.translations?.[0]?.translation === c.label;
    if (same) continue;

    record(`name "${c.name}" → "${c.label}"${c.hidden ? " (hidden)" : ""}`);
    if (!DRY) await api(`/collections/${c.name}`, { method: "PATCH", body: JSON.stringify({ meta }) });
  }

  /* Anything with a table that model.mjs has never heard of. Reported
   * rather than hidden or ignored: a new table appearing in the admin
   * panel unnamed means a migration landed and nobody described it yet,
   * and silence is how it stays that way for a year. */
  const unknown = existing
    .filter((c) => c.schema && !c.collection.startsWith("directus_") && !configured.has(c.collection))
    .map((c) => c.collection);
  if (unknown.length) {
    console.log(`\n  ⚠ ${unknown.length} table(s) not described in model.mjs: ${unknown.join(", ")}`);
    console.log(`    They will show in the admin panel under their raw table names.`);
  }
}

/* ── Fields ───────────────────────────────────────────────────────────── */

async function configureFields() {
  for (const [collection, fields] of Object.entries(FIELDS)) {
    let existing;
    try {
      existing = await api(`/fields/${collection}`);
    } catch {
      console.log(`  ⚠ skip fields for "${collection}" — collection not found`);
      continue;
    }
    const byName = new Map(existing.map((f) => [f.field, f]));

    for (const [field, spec] of Object.entries(fields)) {
      const found = byName.get(field);
      if (!found) {
        console.log(`  ⚠ skip  ${collection}.${field} — no such column`);
        continue;
      }
      const meta = {
        note: spec.note ?? null,
        readonly: spec.readonly ?? false,
        hidden: spec.hidden ?? false,
        required: spec.required ?? false,
        translations: [{ language: "en-US", translation: spec.label }],
      };
      const cur = found.meta ?? {};
      const same =
        (cur.note ?? null) === meta.note &&
        Boolean(cur.readonly) === meta.readonly &&
        Boolean(cur.hidden) === meta.hidden &&
        cur.translations?.[0]?.translation === spec.label;
      if (same) continue;

      record(`label ${collection}.${field} → "${spec.label}"`);
      if (!DRY) {
        await api(`/fields/${collection}/${field}`, {
          method: "PATCH",
          body: JSON.stringify({ meta }),
        });
      }
    }
  }
}

/**
 * `review_state` is a text column with a CHECK constraint behind it.
 * Directus cannot see a CHECK, so without this it renders a free-text box
 * and an editor types "Approved " with a trailing space, the insert
 * fails, and the message they get is about a constraint they have never
 * heard of. A dropdown makes the four legal values the only reachable
 * ones.
 */
async function configureReviewDropdown() {
  const choices = [
    { text: "Draft — still writing", value: "draft" },
    { text: "Submitted for review", value: "submitted" },
    { text: "Approved (Administrators only)", value: "approved" },
    { text: "Changes requested", value: "changes_requested" },
  ];
  let field;
  try {
    field = await api("/fields/posts/review_state");
  } catch {
    return;
  }
  if (JSON.stringify(field.meta?.options?.choices ?? []) === JSON.stringify(choices)) return;

  record("make posts.review_state a dropdown of the four legal values");
  if (!DRY) {
    await api("/fields/posts/review_state", {
      method: "PATCH",
      body: JSON.stringify({
        meta: {
          ...field.meta,
          interface: "select-dropdown",
          options: { choices },
          display: "labels",
        },
      }),
    });
  }
}

/**
 * Make `posts.created_by` fill itself in from the signed-in account.
 *
 * A permission preset is NOT enough, and a test proved it: a preset is a
 * default for an absent field, so a Member who sends
 * `"created_by": "<somebody else's id>"` in the request body has their
 * value kept, and every "your own posts" filter in the policy then points
 * at the wrong person. Ownership was forgeable.
 *
 * `user-created` is a server-side special: Directus writes the
 * authenticated user's id on insert and ignores whatever was submitted.
 * That makes ownership a property of the session rather than of the
 * request body, which is the only version of it worth having.
 */
async function configureOwnershipField() {
  let field;
  try {
    field = await api("/fields/posts/created_by");
  } catch {
    return;
  }
  if (field.meta?.special?.includes("user-created")) return;

  record("make posts.created_by fill itself in from the signed-in account");
  if (!DRY) {
    await api("/fields/posts/created_by", {
      method: "PATCH",
      body: JSON.stringify({
        meta: { ...field.meta, special: ["user-created"], readonly: true, hidden: true },
      }),
    });
  }
}

/* ── The Member role ──────────────────────────────────────────────────── */

/**
 * Exactly what a Member may do. Anything not listed is denied, because
 * Directus denies by default — this array IS the permission set, not a
 * set of overrides on something broader.
 *
 * `permissions` is a row filter. `_and: [{ created_by: { _eq: "$CURRENT_USER" } }]`
 * is what makes "your own posts" mean your own and not everybody's.
 */
/**
 * A Member may move a post to 'submitted'. They may NOT move it to
 * 'approved' — that is the whole approval step, and leaving the field
 * writable without this would let an author approve their own work.
 *
 * The database would refuse it anyway: `posts_approval_needs_attribution`
 * demands a reviewer and a timestamp, and neither is a field a Member can
 * set. But relying on that means the author sees a constraint-violation
 * error instead of being told what they are allowed to do, and it leaves
 * the rule true only by accident of another rule.
 */
const NOT_PUBLISHED_NOT_APPROVED = {
  _and: [
    { published: { _eq: false } },
    { review_state: { _in: ["draft", "submitted", "changes_requested"] } },
  ],
};

function memberPermissions(policyId) {
  const mine = { _and: [{ created_by: { _eq: "$CURRENT_USER" } }] };

  /** Fields a Member may set. `published`, `reviewed_by`, `reviewed_at`
   *  and `review_note` are absent on purpose: those belong to the
   *  Administrator who approves the post. */
  const writable = [
    "title", "slug", "excerpt", "body", "body_format",
    "author_name", "author_member_id", "cover_asset_id", "tags", "review_state",
  ];

  return [
    // Write a post. `created_by` is forced to the author by a preset, so
    // a Member cannot create a post owned by somebody else — and
    // `published` is pinned false and `review_state` to draft regardless
    // of what the request body says.
    {
      policy: policyId,
      collection: "posts",
      action: "create",
      fields: writable,
      permissions: {},
      validation: NOT_PUBLISHED_NOT_APPROVED,
      presets: { created_by: "$CURRENT_USER", published: false, review_state: "draft" },
    },
    // Read your own, in any state, so you can see a reviewer's note.
    {
      policy: policyId,
      collection: "posts",
      action: "read",
      fields: ["*"],
      permissions: mine,
    },
    // Edit your own until it is approved. The `review_state` filter is
    // what stops a Member editing a post AFTER an Administrator approved
    // it — otherwise "approve" would mean "approve whatever it says
    // next week".
    {
      policy: policyId,
      collection: "posts",
      action: "update",
      fields: writable,
      permissions: {
        _and: [
          { created_by: { _eq: "$CURRENT_USER" } },
          { review_state: { _in: ["draft", "changes_requested"] } },
        ],
      },
      validation: NOT_PUBLISHED_NOT_APPROVED,
    },
    // Delete your own drafts, and only drafts. Once it is with a
    // reviewer it is part of a conversation.
    {
      policy: policyId,
      collection: "posts",
      action: "delete",
      permissions: {
        _and: [
          { created_by: { _eq: "$CURRENT_USER" } },
          { review_state: { _eq: "draft" } },
        ],
      },
    },

    // Upload a cover picture, and see the ones already there. Writing a
    // post means choosing an image; without this the one permitted task
    // cannot be finished. A Member cannot publish an image to the site —
    // `published` is not in the field list and is preset false.
    {
      policy: policyId,
      collection: "assets",
      action: "create",
      fields: ["alt", "credit", "source_ref"],
      permissions: {},
      presets: { published: false },
    },
    { policy: policyId, collection: "assets", action: "read", fields: ["*"], permissions: {} },

    // Read-only, so a byline can point at the right person.
    { policy: policyId, collection: "members", action: "read", fields: ["id", "name"], permissions: {} },
  ];
}

async function ensureMemberRole() {
  const roles = await api(`/roles?filter[name][_eq]=${encodeURIComponent(MEMBER_ACCESS.role.name)}`);
  let role = roles[0];
  if (!role) {
    record(`create role "${MEMBER_ACCESS.role.name}"`);
    if (DRY) return null;
    role = await api("/roles", { method: "POST", body: JSON.stringify(MEMBER_ACCESS.role) });
  }

  const policies = await api(`/policies?filter[name][_eq]=${encodeURIComponent(MEMBER_ACCESS.policy.name)}`);
  let policy = policies[0];
  if (!policy) {
    record(`create policy "${MEMBER_ACCESS.policy.name}"`);
    if (DRY) return null;
    policy = await api("/policies", {
      method: "POST",
      body: JSON.stringify({
        ...MEMBER_ACCESS.policy,
        // app_access lets them sign in to the admin panel at all.
        // admin_access false is the whole point of this role.
        admin_access: false,
        app_access: true,
      }),
    });
  }

  const access = await api(`/access?filter[role][_eq]=${role.id}&filter[policy][_eq]=${policy.id}`);
  if (!access.length) {
    record(`attach "${MEMBER_ACCESS.policy.name}" to the Member role`);
    if (!DRY) {
      await api("/access", {
        method: "POST",
        body: JSON.stringify({ role: role.id, policy: policy.id }),
      });
    }
  }

  /* Permissions are REPLACED, not merged. A permission this script no
   * longer grants must actually disappear — otherwise removing access
   * from model.mjs would silently leave it in place, which is the worst
   * possible failure mode for a permission system. */
  const wanted = memberPermissions(policy.id);
  const current = await api(`/permissions?filter[policy][_eq]=${policy.id}&limit=-1`);
  const same =
    current.length === wanted.length &&
    wanted.every((w) =>
      current.some(
        (c) =>
          c.collection === w.collection &&
          c.action === w.action &&
          JSON.stringify(c.permissions ?? {}) === JSON.stringify(w.permissions ?? {}) &&
          JSON.stringify(c.validation ?? null) === JSON.stringify(w.validation ?? null) &&
          JSON.stringify(c.presets ?? null) === JSON.stringify(w.presets ?? null) &&
          JSON.stringify(c.fields ?? null) === JSON.stringify(w.fields ?? null),
      ),
    );
  if (same) return policy;

  record(`set ${wanted.length} permissions on "${MEMBER_ACCESS.policy.name}" (replacing ${current.length})`);
  if (!DRY) {
    for (const p of current) await api(`/permissions/${p.id}`, { method: "DELETE" });
    for (const p of wanted) await api("/permissions", { method: "POST", body: JSON.stringify(p) });
  }
  return policy;
}

/* ── Publish → rebuild ────────────────────────────────────────────────── */

/**
 * The site is a STATIC EXPORT. There is no server rendering pages on
 * request, which is why the site stays up when the API is down (§6.2) —
 * and it is also why pressing "publish" in Directus changes nothing at
 * all until something rebuilds. Without this, an editor publishes a post,
 * reloads the site, sees the old page, and reasonably concludes the admin
 * panel is broken.
 *
 * The Flow fires on every change to a collection a visitor can see and
 * POSTs to a rebuild hook. What sits on the other end is a deployment
 * decision nobody has made yet (§16.13) — a GitHub Actions
 * `repository_dispatch`, a Netlify or Vercel build hook, a webhook on the
 * club's own server — so the URL comes from the environment and this
 * script refuses to invent one.
 *
 * Deliberately fires on `items.create` and `items.delete` too: an
 * unpublished draft appearing is a no-op for the site, but a published
 * item being DELETED absolutely must reach it, and that is the case
 * people forget.
 */
const REBUILD_COLLECTIONS = [
  "events", "event_segments", "posts", "projects", "achievements",
  "press", "partners", "committees", "committee_groups", "committee_sections",
  "members", "memberships", "moderators", "assets", "collections",
  "collection_items", "redirects",
];

async function ensureRebuildFlow() {
  const url = process.env.REBUILD_WEBHOOK_URL;
  if (!url) {
    console.log(
      "  ⚠ REBUILD_WEBHOOK_URL is not set, so no rebuild is wired up.\n" +
        "    Publishing will change the database and NOT the website until it is:\n" +
        "    the site is a static export and something has to rebuild it.\n" +
        "    Set it to a CI build hook and re-run this script.",
    );
    return;
  }

  const NAME = "Rebuild the website on publish";
  const flows = await api(`/flows?filter[name][_eq]=${encodeURIComponent(NAME)}`);
  if (flows.length) return;

  record(`create flow "${NAME}" → ${url.replace(/\?.*$/, "")}`);
  if (DRY) return;

  const flow = await api("/flows", {
    method: "POST",
    body: JSON.stringify({
      name: NAME,
      icon: "cloud_upload",
      description:
        "Tells the deployment to rebuild the static site whenever published content " +
        "changes. Without this, edits stay invisible to visitors.",
      status: "active",
      trigger: "event",
      // "action" is the non-blocking, after-the-fact hook. A "filter"
      // trigger runs BEFORE the write and would make every save in the
      // admin panel wait on an external HTTP request — and fail the save
      // if the build service is down.
      options: {
        type: "action",
        scope: ["items.create", "items.update", "items.delete"],
        collections: REBUILD_COLLECTIONS,
      },
      accountability: "all",
    }),
  });

  const operation = await api("/operations", {
    method: "POST",
    body: JSON.stringify({
      flow: flow.id,
      name: "Call the build hook",
      key: "call_build_hook",
      type: "request",
      position_x: 19,
      position_y: 1,
      options: {
        url,
        method: "POST",
        headers: process.env.REBUILD_WEBHOOK_TOKEN
          ? [{ header: "Authorization", value: `Bearer ${process.env.REBUILD_WEBHOOK_TOKEN}` }]
          : [],
        body: JSON.stringify({ reason: "directus-publish" }),
      },
    }),
  });

  await api(`/flows/${flow.id}`, {
    method: "PATCH",
    body: JSON.stringify({ operation: operation.id }),
  });
}

/* ── Run ──────────────────────────────────────────────────────────────── */

console.log(`Directus at ${URL_BASE}${DRY ? "  (dry run)" : ""}\n`);
await login();

const existing = await api("/collections");

console.log("Folders");
await ensureFolders(existing);
console.log("\nCollections");
await configureCollections(existing);
console.log("\nFields");
await configureFields();
await configureReviewDropdown();
await configureOwnershipField();
console.log("\nRoles and permissions");
await ensureMemberRole();
console.log("\nPublish → rebuild");
await ensureRebuildFlow();

console.log(
  changes.length
    ? `\n${changes.length} change(s)${DRY ? " pending — re-run without --dry-run to apply" : " applied"}.`
    : "\nAlready configured; nothing to change.",
);
