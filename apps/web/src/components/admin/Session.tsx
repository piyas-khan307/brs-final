"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WHO IS SIGNED IN.
 *
 * One provider for the whole /admin area. Everything below it can ask
 * `useSession()` for the current user and whether they are an
 * Administrator.
 *
 * ── ON `isAdministrator` ──
 * It decides what to SHOW, never what to allow. Directus decides what to
 * allow, against the policy configured in apps/cms and verified by the
 * tests there. If this flag were somehow wrong, the consequence is a menu
 * entry that leads to a polite refusal — not access to anything.
 *
 * Hiding what someone cannot do is not security theatre here; it is the
 * entire point of the exercise. A club secretary should not have to learn
 * which of twelve menu items will reject them.
 * ══════════════════════════════════════════════════════════════════════
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  ensureFreshToken,
  login as apiLogin,
  logout as apiLogout,
  me,
  refreshSession,
  setOnSignedOut,
  type Me,
} from "@/lib/admin/client";

type SessionState = {
  user: Me | null;
  /** True until the first refresh attempt settles. The shell must not
   *  bounce anyone to the login page before this is false, or a page
   *  refresh looks like being logged out. */
  loading: boolean;
  /** The session ended UNDERNEATH somebody who was already working. The
   *  shell answers this with a sign-in panel over the page rather than a
   *  navigation, so nothing that was typed is torn down. Never true after
   *  an explicit Sign out — that is a person leaving, not a session
   *  ending, and they get the login page. */
  expired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/** How often to look at the clock. The check itself is a subtraction —
 *  it only reaches the network when the token is within a minute of
 *  expiry, so this is one request every quarter of an hour, not one a
 *  minute. */
const KEEPALIVE_MS = 60_000;

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  // The access token lives in memory only, so a reload starts with
  // nothing. The refresh cookie is what makes the session survive, and
  // this is where it is spent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshSession();
      if (cancelled) return;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const u = await me();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── KEEPING A SESSION THAT IS IN USE ALIVE ──
     The access token is good for fifteen minutes. Writing up an event is
     not a fifteen-minute job, and nothing here used to renew the token
     between requests — so the failure was reliably the picture upload an
     hour in, and signing in again cost the hour.

     A minute's tick is enough: `ensureFreshToken()` re-mints only inside
     the last minute of a token's life, so this is one quiet request every
     quarter of an hour while the tab is open. Each one slides the refresh
     cookie's own window forward too, which is what makes the promise —
     signed in until you sign out — actually true.

     Timers do not run while a laptop is shut, so the tab coming back to
     the front and the network returning both force a check as well. */
  useEffect(() => {
    // Nothing to keep alive before signing in, and nothing to be gained
    // once it has already lapsed — the panel is asking for a password,
    // and a re-mint a minute would only be a refusal a minute.
    if (!user || expired) return;

    let stop = false;
    const tick = () => {
      if (!stop && document.visibilityState !== "hidden") void ensureFreshToken();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void ensureFreshToken();
    };

    const timer = setInterval(tick, KEEPALIVE_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [user, expired]);

  /* A session can still end while a form is open — a server restart, an
     administrator revoking the account, a week away from the desk. When
     the next request proves it, say so.

     What this must NOT do is drop the user, which is what it used to do:
     that sent the shell to the login page, which unmounted the editor,
     which threw away everything typed since the last save. The person is
     still who they were; it is the token that is gone. So raise a flag
     and let the shell put a sign-in panel over the page it is already
     showing. */
  useEffect(() => {
    setOnSignedOut(() => setExpired(true));
    return () => setOnSignedOut(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    setUser(await me());
    setExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setExpired(false);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, expired, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
