import { useEffect, useState } from "react";
import { useMarket } from "@/providers/market";
import { searchTickers } from "@/shared/api";
import type { TickerSearchResult } from "@/shared/types";

export const TICKER_SEARCH_DEBOUNCE_MS = 300;
export const TICKER_SEARCH_MIN_QUERY = 2;
/** Below this many local matches, the market's wider listing is worth asking. */
export const FEW_LOCAL_MATCHES = 5;

/**
 * The selected market's wider listing for `query`, through /api/tickers/search,
 * once typing pauses. `null` until an answer for exactly this market and query
 * arrives (a stale answer never shows under a new query) and whenever the
 * search is off. A failed search answers `[]`: callers already show what they
 * matched locally. EG's local list is the whole exchange, so EG never searches.
 */
export function useTickerSearch(query: string, enabled: boolean): TickerSearchResult[] | null {
  const { market } = useMarket();
  const q = query.trim();
  const active = enabled && market.code !== "EG" && q.length >= TICKER_SEARCH_MIN_QUERY;
  const [found, setFound] = useState<{ key: string; items: TickerSearchResult[] } | null>(null);
  const key = `${market.code}:${q}`;

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchTickers(q, { market: market.code, signal: ctrl.signal })
        .then((items) => {
          if (!ctrl.signal.aborted) setFound({ key, items });
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setFound({ key, items: [] });
        });
    }, TICKER_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [active, q, key, market.code]);

  return active && found?.key === key ? found.items : null;
}
