import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from "@/shared/api";

import { useMarket } from "./market";

interface WatchlistCtx {
  symbols: string[];
  loading: boolean;
  add: (sym: string) => void;
  remove: (sym: string) => void;
  has: (sym: string) => boolean;
}

const Ctx = createContext<WatchlistCtx | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const { market } = useMarket();

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ported verbatim from web: reset on sign-out
      setSymbols([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWatchlist()
      .then((resp) => {
        if (!cancelled) setSymbols(resp.symbols || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, market.code]);

  // Optimistic, and rolled back if the API refuses — same as the web.
  const add = useCallback((sym: string) => {
    const upper = sym.toUpperCase();
    setSymbols((prev) => (prev.includes(upper) ? prev : [...prev, upper]));
    addToWatchlist(upper).catch(() => {
      setSymbols((prev) => prev.filter((s) => s !== upper));
    });
  }, []);

  const remove = useCallback((sym: string) => {
    const upper = sym.toUpperCase();
    let prevList: string[] = [];
    setSymbols((prev) => {
      prevList = prev;
      return prev.filter((s) => s !== upper);
    });
    removeFromWatchlist(upper).catch(() => {
      setSymbols(prevList);
    });
  }, []);

  const has = useCallback((sym: string) => symbols.includes(sym.toUpperCase()), [symbols]);

  const value = useMemo<WatchlistCtx>(() => ({ symbols, loading, add, remove, has }), [symbols, loading, add, remove, has]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWatchlist(): WatchlistCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  return ctx;
}
