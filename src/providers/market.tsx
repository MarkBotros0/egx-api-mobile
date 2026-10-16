/**
 * Which market (EG / US) the app is showing. Persisted on the device for an
 * instant boot and on the server so it follows the user across devices; the
 * server wins once it answers. Every shared API call reads it via setApiMarket.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { fetchMarketPref, fetchMarkets, putMarketPref, setApiMarket } from "@/shared/api";
import { DEFAULT_MARKET, EG_FALLBACK, fallbackMarket, type Market, type MarketCode } from "@/shared/markets";

export const MARKET_STORAGE_KEY = "egx.market";

export interface MarketCtx {
  /** The selected market's display fields. */
  market: Market;
  /** Enabled markets; a single entry hides the changer. */
  markets: Market[];
  setMarket: (code: MarketCode) => void;
  loading: boolean;
}

const Ctx = createContext<MarketCtx | null>(null);

const pick = (markets: Market[], code: string | null | undefined): Market =>
  markets.find((m) => m.code === code) ?? markets.find((m) => m.code === DEFAULT_MARKET) ?? EG_FALLBACK;

// BEFORE /api/markets has answered, a stored code (US on a cold start) reads
// as ITS OWN built-in facts, never as EG: screens branch on market.code, and
// EG copy over US data was the failure. Once the list is in, it is
// authoritative — a code it does not list (US not enabled) falls back to EG.
const pickBeforeList = (markets: Market[], code: string | null | undefined): Market =>
  markets.find((m) => m.code === code) ?? (code ? fallbackMarket(code) : pick(markets, code));

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([EG_FALLBACK]);
  const [code, setCode] = useState<MarketCode>(DEFAULT_MARKET);
  const [loading, setLoading] = useState(true);
  const [listed, setListed] = useState(false);

  const apply = useCallback((next: MarketCode) => {
    setApiMarket(next);
    setCode(next);
    AsyncStorage.setItem(MARKET_STORAGE_KEY, next).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    // A sign-in or account switch re-runs this: hide the changer until the
    // new user's preference has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on sign-in / account switch, before awaiting
    setLoading(true);
    (async () => {
      const stored = await AsyncStorage.getItem(MARKET_STORAGE_KEY).catch(() => null);
      if (!cancelled && (stored === "EG" || stored === "US")) {
        setApiMarket(stored);
        setCode(stored);
      }
      if (!isAuthenticated) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [list, pref] = await Promise.all([
        fetchMarkets().catch(() => null),
        fetchMarketPref().catch(() => null),
      ]);
      if (cancelled) return;
      const enabled = list?.markets?.length ? list.markets : [EG_FALLBACK];
      setMarkets(enabled);
      setListed(true);
      apply(pick(enabled, pref?.market ?? stored).code);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, apply]);

  const setMarket = useCallback(
    (next: MarketCode) => {
      if (next === code || !markets.some((m) => m.code === next)) return;
      apply(next);
      putMarketPref(next).catch(() => {
        // The device keeps the choice; the next successful boot syncs it.
      });
    },
    [apply, code, markets]
  );

  const value = useMemo<MarketCtx>(
    () => ({ market: (listed ? pick : pickBeforeList)(markets, code), markets, setMarket, loading }),
    [markets, code, setMarket, loading, listed]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const OUTSIDE: MarketCtx = { market: EG_FALLBACK, markets: [EG_FALLBACK], setMarket: () => {}, loading: false };

/** Outside a provider: the EG fallback and a no-op setter. */
export function useMarket(): MarketCtx {
  return useContext(Ctx) ?? OUTSIDE;
}
