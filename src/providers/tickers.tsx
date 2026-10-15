import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchTickers } from "@/shared/api";
import type { Ticker } from "@/shared/types";
import { useAuth } from "@/auth/AuthProvider";
import { useMarket } from "./market";

interface TickersCtx {
  tickers: Ticker[];
  loading: boolean;
}

const Ctx = createContext<TickersCtx | null>(null);

export function TickersProvider({ children }: { children: React.ReactNode }) {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const { market } = useMarket();

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ported verbatim from web: reset on sign-out
      setTickers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchTickers()
      .then((data) => {
        if (!cancelled) setTickers(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, market.code]);

  const value = useMemo<TickersCtx>(
    () => ({ tickers, loading }),
    [tickers, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTickers(): TickersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { tickers: [], loading: false };
  return ctx;
}
