import type { Ticker } from "@/shared/types";
import type { CardMap } from "./cards";

export const INDICES = ["EGX30", "EGX70", "EGX100", "NILEX", "All"] as const;

export const ALL_SECTORS = "All Sectors";
export const SECTORS = [
  ALL_SECTORS, "Banking", "Real Estate", "Financial Services", "Industrials",
  "Consumer Goods", "Basic Materials", "Healthcare", "Technology", "Energy",
  "Telecommunications",
] as const;

export const SORTS = ["Default", "Score", "Change", "Risk", "Recently paid"] as const;
export type SortKey = (typeof SORTS)[number];
/** The dashboard opens on the composite ranking; "Default" is the ticker-file order. */
export const DEFAULT_SORT: SortKey = "Score";

/** The web shows these as hover titles; the phone shows them under the row. */
export const SORT_EXPLANATIONS: Partial<Record<SortKey, string>> = {
  Risk: "Calmest first, by past 63-day volatility — the app's strongest measured signal. It predicts how much a stock moves and how deep a hole to expect, never which way it goes.",
  Score: "Highest composite first. The score describes present condition; it does not predict price.",
};

export const COMPOSITE_INTERVALS = ["Daily", "Weekly", "Monthly"] as const;
export type CompositeInterval = (typeof COMPOSITE_INTERVALS)[number];

export interface TickerFilter {
  index: string;
  sector: string;
  search: string;
}

/** Index, sector, then symbol/name search. The search is trimmed — phone keyboards add trailing spaces. */
export function filterTickers(tickers: Ticker[], f: TickerFilter): Ticker[] {
  let result = tickers;
  if (f.index !== "All") result = result.filter((t) => t.index === f.index);
  if (f.sector !== ALL_SECTORS) result = result.filter((t) => t.sector === f.sector);
  const q = f.search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }
  return result;
}

/** No-feed listings move out of the grid (still counted, still findable), never hidden. */
export function splitByFeed(
  tickers: Ticker[],
  noFeed: ReadonlySet<string>
): { quoted: Ticker[]; unquoted: Ticker[] } {
  const quoted: Ticker[] = [];
  const unquoted: Ticker[] = [];
  for (const t of tickers) (noFeed.has(t.symbol.toUpperCase()) ? unquoted : quoted).push(t);
  return { quoted, unquoted };
}

/** "Pays a dividend": yield strictly above 0. 0 means pays nothing; null means unknown. */
export function filterDividendPayers(tickers: Ticker[], cards: CardMap, on: boolean): Ticker[] {
  if (!on) return tickers;
  return tickers.filter((t) => {
    const dy = cards[t.symbol.toUpperCase()]?.dividendYield;
    return dy != null && dy > 0;
  });
}

/**
 * Sort by a card figure. Unmeasured stocks SINK whichever way the sort runs —
 * treating a missing value as 0 would rank them as the worst on the exchange.
 */
export function sortTickers(tickers: Ticker[], cards: CardMap, sort: SortKey): Ticker[] {
  if (sort === "Default") return tickers;
  const val = (t: Ticker): number | null => {
    const c = cards[t.symbol.toUpperCase()];
    if (!c) return null;
    switch (sort) {
      case "Score":
        return c.score ?? null;
      case "Change":
        return c.changePct ?? null;
      case "Recently paid": {
        if (!c.dividendExDate) return null;
        const ms = Date.parse(c.dividendExDate);
        return Number.isNaN(ms) ? null : ms;
      }
      case "Risk":
        return c.sigma ?? null;
      default:
        return null;
    }
  };
  const dir = sort === "Risk" ? 1 : -1;
  return [...tickers].sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    if (av === null && bv === null) return a.symbol.localeCompare(b.symbol);
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * dir;
  });
}

export function pageSlice<T>(
  items: T[],
  page: number,
  perPage: number
): { visible: T[]; hasMore: boolean; remaining: number } {
  const visible = items.slice(0, page * perPage);
  return { visible, hasMore: visible.length < items.length, remaining: items.length - visible.length };
}
