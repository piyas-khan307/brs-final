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

import { login as apiLogin, logout as apiLogout, me, refreshSession, type Me } from "@/lib/admin/client";

type SessionState = {
  user: Me | null;
  /** True until the first refresh attempt settles. The shell must not
   *  bounce anyone to the login page before this is false, or a page
   *  refresh looks like being logged out. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signIn = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    setUser(await me());
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
