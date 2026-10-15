/**
 * Which market (EG / US) the app is showing. Persisted on the device for an
 * instant boot and on the server so it follows the user across devices; the
 * server wins once it answers. Every shared API call reads it via setApiMarket.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { fetchMarketPref, fetchMarkets, putMarketPref, setApiMarket } from "@/shared/api";
import { DEFAULT_MARKET, EG_FALLBACK, type Market, type MarketCode } from "@/shared/markets";

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

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([EG_FALLBACK]);
  const [code, setCode] = useState<MarketCode>(DEFAULT_MARKET);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: MarketCode) => {
    setApiMarket(next);
    setCode(next);
    AsyncStorage.setItem(MARKET_STORAGE_KEY, next).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
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
      apply(pick(enabled, pref?.market ?? stored).code);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, apply]);

  const setMarket = useCallback(
    (next: MarketCode) => {
      if (next === code) return;
      apply(next);
      putMarketPref(next).catch(() => {
        // The device keeps the choice; the next successful boot syncs it.
      });
    },
    [apply, code]
  );

  const value = useMemo<MarketCtx>(
    () => ({ market: pick(markets, code), markets, setMarket, loading }),
    [markets, code, setMarket, loading]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const OUTSIDE: MarketCtx = { market: EG_FALLBACK, markets: [EG_FALLBACK], setMarket: () => {}, loading: false };

/** Outside a provider: the EG fallback and a no-op setter. */
export function useMarket(): MarketCtx {
  return useContext(Ctx) ?? OUTSIDE;
}
