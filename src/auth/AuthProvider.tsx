import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { setupApi } from "@/lib/apiSetup";
import { fetchMe, LoginError, loginRequest } from "@/shared/api";
import type { AuthUser } from "@/shared/auth";

import { clearSession, loadSession, saveSession } from "./tokenStore";

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
    setupApi(signOutLocally);
    let cancelled = false;

    (async () => {
      const { token, user: cached } = await loadSession();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      if (cached && !cancelled) setUser(cached);
      try {
        // Re-read the role from the DB on every boot, like the web.
        const fresh = await fetchMe();
        if (cancelled) return;
        setUser(fresh);
        await saveSession(token, fresh);
      } catch {
        // A 401 already signed us out through signOutLocally. A network error
        // keeps the cached session so the app still opens offline.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
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
