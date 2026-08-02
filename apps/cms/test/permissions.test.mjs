/**
 * ══════════════════════════════════════════════════════════════════════
 * WHAT A MEMBER CAN AND CANNOT DO.
 *
 * The club's requirement was one sentence: a Member can write blog posts,
 * cannot change anything else, and cannot publish without an
 * Administrator approving it. That sentence is now spread across a
 * Directus policy, seven permission rows, two field lists and two CHECK
 * constraints — none of which can be verified by reading them.
 *
 * So this signs in as a real Member and tries to do the forbidden things.
 * A permission model nobody has attacked is a permission model nobody
 * knows the shape of.
 *
 * Needs Directus and Postgres up. Skips cleanly when they are not, rather
 * than failing and teaching everyone to ignore a red test.
 *
 *   docker compose up -d && pnpm --filter @brs/cms configure
 *   pnpm --filter @brs/cms test
 * ══════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const URL_BASE = (process.env.DIRECTUS_URL ?? "http://localhost:8055").replace(/\/+$/, "");
const ADMIN = {
  email: process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.DIRECTUS_ADMIN_PASSWORD ?? "dev-only-change-me",
};
const MEMBER = { email: "test-member@example.com", password: "test-member-password-1" };
const OTHER = { email: "test-member-2@example.com", password: "test-member-password-2" };

/**
 * `skip` is evaluated when the test is DEFINED, before any before() hook
 * runs — a lesson already learned the hard way in @brs/api, where 20
 * tests silently skipped while reporting green. So the reachability check
 * happens at module scope.
 */
const up = await fetch(`${URL_BASE}/server/health`)
  .then((r) => r.ok)
  .catch(() => false);

async function call(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

const login = async (creds) => {
  const { body } = await call("/auth/login", { method: "POST", body: creds });
  return body.data?.access_token;
};

describe("the Member role", { skip: up ? false : "Directus is not running" }, () => {
  let adminToken, memberToken, otherToken, memberId, otherId, roleId;
  const created = [];

  before(async () => {
    adminToken = await login(ADMIN);
    assert.ok(adminToken, "could not sign in as the Administrator");

    const roles = await call("/roles?filter[name][_eq]=Member", { token: adminToken });
    roleId = roles.body.data?.[0]?.id;
    assert.ok(roleId, "the Member role does not exist — run `pnpm --filter @brs/cms configure`");

    for (const [creds, slot] of [[MEMBER, "a"], [OTHER, "b"]]) {
      const existing = await call(`/users?filter[email][_eq]=${creds.email}`, { token: adminToken });
      let id = existing.body.data?.[0]?.id;
      if (!id) {
        const made = await call("/users", {
          token: adminToken,
          method: "POST",
          body: { ...creds, role: roleId, first_name: "Test", last_name: `Member ${slot}` },
        });
        id = made.body.data?.id;
      }
      if (slot === "a") memberId = id;
      else otherId = id;
    }

    memberToken = await login(MEMBER);
    otherToken = await login(OTHER);
    assert.ok(memberToken && otherToken, "the test Member accounts could not sign in");
  });

  after(async () => {
    // Tests that leave rows behind poison the next run.
    for (const id of created) {
      await call(`/items/posts/${id}`, { token: adminToken, method: "DELETE" });
    }
    for (const id of [memberId, otherId]) {
      if (id) await call(`/users/${id}`, { token: adminToken, method: "DELETE" });
    }
  });

  /* ── The one thing they may do ──────────────────────────────────────── */

  it("can write a blog post", async () => {
    const res = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-test-${Date.now()}`,
        title: "A post written by a Member",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    created.push(res.body.data.id);
    assert.equal(res.body.data.published, false, "a new post must not be live");
    assert.equal(res.body.data.review_state, "draft");
  });

  it("is recorded as the author, whatever the request claims", async () => {
    const slug = `member-owner-${Date.now()}`;
    const res = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug,
        title: "Ownership cannot be forged",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
        created_by: otherId, // claiming somebody else wrote it
      },
    });

    // Either outcome is safe, and Directus chooses the stricter one: it
    // refuses the whole request because `created_by` is not a field this
    // policy may write. What must never happen is a stored post whose
    // owner is the forged id — every "your own posts" filter reads it.
    if (res.status === 200) {
      created.push(res.body.data.id);
      assert.equal(res.body.data.created_by, memberId, "created_by was taken from the request body");
    } else {
      assert.ok(res.status >= 400, `unexpected ${res.status}`);
      const check = await call(`/items/posts?filter[slug][_eq]=${slug}`, { token: adminToken });
      assert.equal(check.body.data.length, 0, "the refused post was stored anyway");
    }
  });

  it("can submit their own post for review", async () => {
    const made = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-submit-${Date.now()}`,
        title: "Ready for review",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    created.push(made.body.data.id);
    const res = await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { review_state: "submitted" },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.review_state, "submitted");
  });

  /* ── Everything they may not ────────────────────────────────────────── */

  it("cannot publish a post at creation time", async () => {
    const res = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-publish-${Date.now()}`,
        title: "Straight to the front page",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
        published: true,
      },
    });
    if (res.status === 200) {
      created.push(res.body.data.id);
      assert.equal(res.body.data.published, false, "a Member published a post at creation");
    } else {
      assert.ok(res.status === 400 || res.status === 403, `unexpected ${res.status}`);
    }
  });

  it("cannot publish their own post afterwards", async () => {
    const made = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-selfpub-${Date.now()}`,
        title: "Self publication",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    created.push(made.body.data.id);
    const res = await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { published: true },
    });
    assert.ok(res.status >= 400, "a Member published their own post");

    const check = await call(`/items/posts/${made.body.data.id}`, { token: adminToken });
    assert.equal(check.body.data.published, false);
  });

  it("cannot approve their own post", async () => {
    const made = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-selfapprove-${Date.now()}`,
        title: "Self approval",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    created.push(made.body.data.id);
    const res = await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { review_state: "approved" },
    });
    assert.ok(res.status >= 400, "a Member approved their own post");

    const check = await call(`/items/posts/${made.body.data.id}`, { token: adminToken });
    assert.equal(check.body.data.review_state, "draft");
  });

  it("cannot see or edit another Member's post", async () => {
    const theirs = await call("/items/posts", {
      token: otherToken,
      method: "POST",
      body: {
        slug: `other-member-${Date.now()}`,
        title: "Somebody else's work",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member B",
      },
    });
    created.push(theirs.body.data.id);

    const read = await call(`/items/posts/${theirs.body.data.id}`, { token: memberToken });
    assert.ok(read.status >= 400, "a Member read another Member's post");

    const edit = await call(`/items/posts/${theirs.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { title: "Edited by the wrong person" },
    });
    assert.ok(edit.status >= 400, "a Member edited another Member's post");
  });

  it("cannot edit a post once it has been approved", async () => {
    const made = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-locked-${Date.now()}`,
        title: "Approved and then rewritten",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    created.push(made.body.data.id);

    // Approve it the way an Administrator would.
    const approved = await call(`/items/posts/${made.body.data.id}`, {
      token: adminToken,
      method: "PATCH",
      body: {
        review_state: "approved",
        reviewed_by: memberId,
        reviewed_at: new Date().toISOString(),
      },
    });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));

    // "Approve" must not mean "approve whatever it says next week".
    const res = await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { body: "Completely different text, added after approval." },
    });
    assert.ok(res.status >= 400, "an approved post was edited by its author");
  });

  it("cannot touch anything other than posts", async () => {
    for (const [collection, payload] of [
      ["members", { name: "Invented Person" }],
      ["committees", { ordinal: 99, label: "Invented Committee" }],
      ["events", { slug: "invented", title: "Invented Event" }],
      ["achievements", { year: 2020, programme: "Invented", track: "national" }],
      ["partners", { name: "Invented Sponsor" }],
    ]) {
      const res = await call(`/items/${collection}`, {
        token: memberToken,
        method: "POST",
        body: payload,
      });
      assert.ok(res.status >= 400, `a Member created a row in ${collection}`);
    }
  });

  it("cannot delete a post once it is with a reviewer", async () => {
    const made = await call("/items/posts", {
      token: memberToken,
      method: "POST",
      body: {
        slug: `member-undelete-${Date.now()}`,
        title: "Withdrawn mid-review",
        excerpt: "Written during a permissions test.",
        body: "Body text.",
        author_name: "Test Member",
      },
    });
    created.push(made.body.data.id);
    await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "PATCH",
      body: { review_state: "submitted" },
    });
    const res = await call(`/items/posts/${made.body.data.id}`, {
      token: memberToken,
      method: "DELETE",
    });
    assert.ok(res.status >= 400, "a submitted post was deleted by its author");
  });

  it("cannot publish an image to the site", async () => {
    const res = await call("/items/assets", {
      token: memberToken,
      method: "POST",
      body: {
        storage_key: "sha256/aa/bb/" + "c".repeat(64) + ".avif",
        provider: "s3",
        mime: "image/avif",
        width: 800,
        height: 600,
        alt: "A photograph used during a permissions test",
        checksum: "d".repeat(64),
        published: true,
      },
    });
    if (res.status === 200) {
      assert.equal(res.body.data.published, false, "a Member published an image");
      await call(`/items/assets/${res.body.data.id}`, { token: adminToken, method: "DELETE" });
    } else {
      assert.ok(res.status >= 400);
    }
  });

  it("has no administrative access", async () => {
    const res = await call("/users", { token: memberToken });
    const visible = res.status === 200 ? res.body.data.length : 0;
    assert.ok(visible <= 1, "a Member can enumerate other accounts");

    const made = await call("/users", {
      token: memberToken,
      method: "POST",
      body: { email: "smuggled@example.com", password: "x", role: roleId },
    });
    assert.ok(made.status >= 400, "a Member created a user account");
  });
});
