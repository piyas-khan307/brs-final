/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ADMIN PANEL'S CONNECTION TO DIRECTUS.
 *
 * ── WHY THIS TALKS TO DIRECTUS AND NOT TO /v1 ──
 * Everywhere else in apps/web, reaching past @brs/contract is a lint
 * error, and rightly so: the public site must not know a CMS exists
 * (§7.4). This directory is the deliberate exception, and the reason is
 * that /v1 is a READ-ONLY, UNAUTHENTICATED façade. It has no login, no
 * sessions, and no writes — by design, because it is the thing that stays
 * up when everything else is down.
 *
 * An admin panel needs exactly those three things. The alternative was to
 * build authentication and a write API onto the façade, which would mean
 * reimplementing the permission engine that Directus already has and that
 * has already been configured and tested here. Two permission systems
 * that must agree is a security bug waiting for its moment.
 *
 * So: this is a FRONT-END over Directus's API. Every rule enforced in
 * apps/cms — a Member cannot publish, cannot approve, cannot see another
 * Member's drafts — is enforced by the same server, for this UI, without
 * being restated. What we replace is the screens, not the security.
 *
 * ── WHERE THE TOKEN LIVES ──
 * In memory, plus a refresh token in a cookie that Directus sets and
 * reads itself (`credentials: "include"`). NOT localStorage: a token in
 * localStorage is readable by any script on the origin and survives every
 * tab close, which turns one XSS into a permanent account takeover. In
 * memory means a page refresh has to re-mint from the refresh cookie —
 * one extra request, and the tradeoff is not close.
 * ══════════════════════════════════════════════════════════════════════
 */

export const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

/** The access token for this tab. Never persisted. */
let accessToken: string | null = null;
/** Set when a refresh is in flight, so ten parallel requests that all hit
 *  a stale token queue behind ONE refresh rather than racing to mint ten. */
let refreshing: Promise<string | null> | null = null;

/** Called the moment a request proves the session is over, so the panel
 *  can put the login page up rather than leave someone clicking a form
 *  that will never save. Set by SessionProvider. */
let onSignedOut: (() => void) | null = null;
export function setOnSignedOut(fn: (() => void) | null) {
  onSignedOut = fn;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/**
 * Turn Directus's error vocabulary into something a club secretary can act
 * on.
 *
 * The raw messages are accurate and useless: "You don't have permission to
 * access field 'published' in collection 'posts'" is a sentence about a
 * permission model the reader has never seen. What they need to know is
 * that an Administrator has to do this bit.
 */
function humanise(status: number, code: string | undefined, raw: string): string {
  // Only reachable from /auth/login, which is exempt from the signed-out
  // handling below — so a 401 here is a typed password, not a dead session.
  if (code === "INVALID_CREDENTIALS") {
    return "That email address and password do not match an account.";
  }
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (code === "FORBIDDEN" || status === 403) {
    if (/published/i.test(raw)) {
      return "Only an Administrator can publish. Set the status to “Submitted for review” and an Administrator will take it from there.";
    }
    if (/review_state|approved/i.test(raw)) {
      return "Only an Administrator can approve a post.";
    }
    return "You do not have permission to do that. If you think you should, ask an Administrator.";
  }
  if (status === 404) return "That item no longer exists — it may have been deleted.";

  // Database rules, surfaced where the editor can fix them. These are the
  // constraints from packages/db, and their whole purpose is to be hit.
  if (/posts_publish_needs_approval/.test(raw)) {
    return "This post cannot go live until it has been approved.";
  }
  if (/posts_approval_needs_attribution/.test(raw)) {
    return "An approval has to record who approved it and when.";
  }
  if (/events_published_needs_a_date/.test(raw)) {
    return "A published event has to record when it went public. Use the Publish button rather than ticking the box by hand.";
  }
  if (/events_excerpt_length/.test(raw)) {
    return "The summary must be between 20 and 320 characters, or empty. A longer one breaks the cards in the events feed.";
  }
  if (/event_asset_unique/.test(raw)) {
    return "That photograph is already attached to this event.";
  }
  if (/assets_alt_check/.test(raw)) {
    return "The description is not usable. Write at least three words saying what the photograph shows — not a filename, and not “photo”.";
  }
  if (/one_current_committee/.test(raw)) {
    return "Another committee is already marked as the current one. Unmark it first.";
  }
  if (/duplicate key|unique/i.test(raw)) {
    return "Something with that name or address already exists. Try a different one.";
  }
  if (/term_both_or_neither/.test(raw)) {
    return "Fill in both term years or neither — a half-recorded term reads as a committee that never ended.";
  }
  if (status >= 500) return "The server had a problem. Nothing was saved.";
  return raw;
}

type Options = {
  method?: string;
  body?: unknown;
  /** Set on the refresh call itself, so a failed refresh cannot recurse. */
  noRetry?: boolean;
};

export async function directus<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    // Carries the refresh cookie Directus sets at login.
    credentials: "include",
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const first = parsed?.errors?.[0];
    const raw: string = first?.message ?? `Request failed (${res.status})`;
    const code: string | undefined = first?.extensions?.code;

    /* ── A DEAD SESSION DOES NOT ANNOUNCE ITSELF AS 401 ──
       Directus answers an UNAUTHENTICATED request with 403 FORBIDDEN, not
       401: as far as it is concerned the collection does not exist for
       you, which is not the same statement as "log in". So once the
       refresh token has expired and `accessToken` is null, every call
       comes back 403 and the panel says "You do not have permission to do
       that. If you think you should, ask an Administrator." — advice that
       sends someone to bother an administrator about a session that
       simply ran out.

       Observed exactly that: a refresh returned 401 and the next nine
       clicks on "Add a category" each returned 403, silently.

       `/auth/*` is exempt: a 401 from /auth/login is a wrong password,
       not an ended session, and a 401 from /auth/refresh is the session
       provider's own probe on page load. */
    const isAuthCall = path.startsWith("/auth/");
    const signedOut =
      !isAuthCall && (res.status === 401 || (res.status === 403 && !accessToken));

    // One silent retry when the access token has simply aged out. Without
    // it, leaving a form open over a cup of tea logs you out mid-save.
    if (signedOut && !opts.noRetry) {
      const fresh = await refreshSession();
      if (fresh) return directus<T>(path, { ...opts, noRetry: true });
    }

    // Refresh did not help, so the session is genuinely over. Say that,
    // and say it for the 403 case too — the status code is Directus's
    // opinion about a request, not about the person making it.
    if (signedOut) {
      onSignedOut?.();
      throw new AdminError(
        "Your session has ended. Sign in again to carry on.",
        401,
        "SESSION_EXPIRED",
      );
    }

    throw new AdminError(humanise(res.status, code, raw), res.status, code);
  }

  return parsed.data as T;
}

/* ── Session ──────────────────────────────────────────────────────────── */

export type Me = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: { id: string; name: string } | null;
  isAdministrator: boolean;
};

export async function login(email: string, password: string): Promise<void> {
  const data = await directus<{ access_token: string }>("/auth/login", {
    body: { email, password, mode: "cookie" },
    noRetry: true,
  });
  accessToken = data.access_token;
}

export async function logout(): Promise<void> {
  try {
    await directus("/auth/logout", { body: { mode: "cookie" }, noRetry: true });
  } finally {
    accessToken = null;
  }
}

/** Mint a new access token from the refresh cookie. Null when there is no
 *  usable session — the caller shows the login page rather than an error. */
export async function refreshSession(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const data = await directus<{ access_token: string }>("/auth/refresh", {
        body: { mode: "cookie" },
        noRetry: true,
      });
      accessToken = data.access_token;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function me(): Promise<Me> {
  const u = await directus<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: { id: string; name: string } | null;
  }>("/users/me?fields=id,email,first_name,last_name,role.id,role.name");

  return {
    ...u,
    // The role NAME is a label an administrator can rename in Directus, so
    // it is a hint for the interface, never a security boundary. Every
    // actual restriction is enforced by Directus against the policy. If
    // this were wrong, the worst outcome is a menu item that returns
    // "you do not have permission" — not access.
    isAdministrator: u.role?.name === "Administrator",
  };
}

/* ── Convenience wrappers ─────────────────────────────────────────────── */

/** Directus filters are deeply nested query params; building them by hand
 *  in every caller is where typos become empty result sets that look like
 *  empty tables. */
export function query(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const items = {
  list: <T>(collection: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    directus<T[]>(`/items/${collection}${query(params)}`),
  get: <T>(collection: string, id: string, params: Record<string, string> = {}) =>
    directus<T>(`/items/${collection}/${id}${query(params)}`),
  create: <T>(collection: string, body: unknown) =>
    directus<T>(`/items/${collection}`, { body }),
  update: <T>(collection: string, id: string, body: unknown) =>
    directus<T>(`/items/${collection}/${id}`, { method: "PATCH", body }),
  remove: (collection: string, id: string) =>
    directus<void>(`/items/${collection}/${id}`, { method: "DELETE" }),
};
