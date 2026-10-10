import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { setupApi } from "@/lib/apiSetup";
import { fetchMe, LoginError, loginRequest } from "@/shared/api";
import type { AuthUser } from "@/shared/auth";

import { clearSession, currentToken, loadSession, saveSession } from "./tokenStore";

/** A captive portal / half-open connection can leave /auth/me pending forever; stop waiting after this. */
export const BOOT_AUTH_TIMEOUT_MS = 8000;

// API setup happens at module load so the base URL and token getter are in
// place before any child renders or effect runs (child effects run before the
// provider's own). The 401 handler forwards to whichever provider is mounted.
let unauthorizedHandler: (() => void) | null = null;
setupApi(() => unauthorizedHandler?.());

interface AuthCtx {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const UNREACHABLE = "Could not reach the server. Check your connection and try again.";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Any 401 from the API means the token is dead (secret rotated, user
  // disabled). Drop to the login screen — the router guard does the navigation.
  const signOutLocally = useCallback(() => {
    void clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    unauthorizedHandler = signOutLocally;
    let cancelled = false;

    (async () => {
      const { token, user: cached } = await loadSession();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      if (cached && !cancelled) setUser(cached);
      // Re-read the role from the DB on every boot, like the web. A 401 signs
      // us out through signOutLocally; a network error or timeout keeps the
      // cached session so the app still opens offline.
      const refresh = fetchMe()
        .then(async (fresh) => {
          // The reply may land after the timeout; never resurrect or
          // overwrite a session that changed (logout / 401) in the meantime.
          if (cancelled || currentToken() !== token) return;
          setUser(fresh);
          await saveSession(token, fresh);
        })
        .catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, BOOT_AUTH_TIMEOUT_MS);
      });
      await Promise.race([refresh, timeout]);
      clearTimeout(timer);
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      if (unauthorizedHandler === signOutLocally) unauthorizedHandler = null;
    };
  }, [signOutLocally]);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const session = await loginRequest(username, password);
      await saveSession(session.token, session.user);
      setUser(session.user);
    } catch (e) {
      setError(e instanceof LoginError ? e.message : UNREACHABLE);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      isLoading,
      error,
      login,
      logout,
    }),
    [user, isLoading, error, login, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
