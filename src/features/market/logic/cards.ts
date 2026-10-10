import type { CompositeBatchResponse, DashboardRow } from "@/shared/api";
import type { CompositeSignal, Ticker } from "@/shared/types";

/**
 * What a dashboard card knows about its own data (web StockCard `CardState`).
 * "--" used to mean three different things; these keep them apart.
 */
export type CardState = "loading" | "live" | "stale" | "unavailable" | "failed";

export interface CardData {
  price?: number;
  change?: number;
  changePct?: number;
  sparkline?: number[];
  score?: number | null;
  signal?: CompositeSignal | null;
  state: CardState;
  /** Past 63-day volatility, for the Risk sort. Snapshot only. */
  sigma?: number | null;
  /** Calm..Wild band. Snapshot only — the live upgrade carries it through. */
  riskBand?: string | null;
  riskBandLabel?: string | null;
  /** The SESSION this price came from ("2026-09-02"), per card. */
  barDate?: string | null;
  /** When THESE figures were fetched, epoch ms (snapshot clock or the moment a live upgrade landed). */
  fetchedAt?: number;
  /** 0 = pays nothing (real); null = unknown. */
  dividendYield?: number | null;
  dividendExDate?: string | null;
}

export type CardMap = Record<string, CardData>;

export interface WatchlistPrice {
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export interface UpgradeBook {
  noFeed: ReadonlySet<string>;
  inFlight: ReadonlySet<string>;
  upgraded: ReadonlySet<string>;
  attempts: ReadonlyMap<string, number>;
  maxAttempts: number;
}

/** Step 1 — the snapshot: one request, the whole universe, as "stale" cards. */
export function cardsFromSnapshot(rows: DashboardRow[]): { cards: CardMap; noFeed: Set<string> } {
  const cards: CardMap = {};
  const noFeed = new Set<string>();
  for (const row of rows) {
    const sym = row.symbol.toUpperCase();
    if (!row.available) noFeed.add(sym);
    cards[sym] = {
      price: row.price ?? undefined,
      change: row.change ?? undefined,
      changePct: row.change_pct ?? undefined,
      sparkline: row.sparkline,
      score: row.score,
      signal: row.signal,
      sigma: row.sigma_63_ann_pct,
      riskBand: row.risk_band,
      riskBandLabel: row.risk_band_label,
      barDate: row.last_bar_date,
      fetchedAt: row.measured_at ? Date.parse(row.measured_at) : undefined,
      dividendYield: row.dividend_yield,
      dividendExDate: row.dividend_ex_date_recent,
      state: row.available ? "stale" : "unavailable",
    };
  }
  return { cards, noFeed };
}

/** Merge, never replace: a live upgrade that already landed must not go back to stale. */
export function mergeSnapshot(prev: CardMap, next: CardMap): CardMap {
  const merged: CardMap = { ...next };
  for (const [sym, existing] of Object.entries(prev)) {
    if (existing.state === "live") merged[sym] = existing;
  }
  return merged;
}

/** Weights/interval/refresh change what a score MEANS: demote live → stale, never drop. */
export function demoteLive(prev: CardMap): CardMap {
  const next: CardMap = {};
  for (const [sym, c] of Object.entries(prev)) {
    next[sym] = c.state === "live" ? { ...c, state: "stale" } : c;
  }
  return next;
}

/**
 * Step 2 — fold one live batch chunk into the cards. A card that already holds
 * snapshot figures keeps them on error; only a card with nothing to show fails.
 */
export function applyBatchChunk(
  prev: CardMap,
  partial: CompositeBatchResponse,
  fetchedAt: number
): { cards: CardMap; upgraded: string[] } {
  const next: CardMap = { ...prev };
  const upgraded: string[] = [];
  for (const [sym, entry] of Object.entries(partial.scores)) {
    const key = sym.toUpperCase();
    const existing = next[key];
    upgraded.push(key);
    next[key] = {
      ...existing,
      score: entry.score,
      signal: entry.signal,
      price: entry.price ?? existing?.price,
      change: entry.change ?? existing?.change,
      changePct: entry.change_pct ?? existing?.changePct,
      sparkline: entry.sparkline ?? existing?.sparkline,
      barDate: entry.last_bar_date ?? existing?.barDate,
      fetchedAt,
      state: "live",
    };
  }
  for (const { symbol } of partial.errors) {
    const key = symbol.toUpperCase();
    const existing = next[key];
    if (!existing || existing.price === undefined) {
      next[key] = { ...existing, state: "failed" };
    }
  }
  return { cards: next, upgraded };
}

/** Which of these symbols may be requested live right now. */
export function upgradeCandidates(symbols: string[], book: UpgradeBook): string[] {
  return symbols.filter((s) => {
    const sym = s.toUpperCase();
    if (book.noFeed.has(sym)) return false;
    if (book.inFlight.has(sym)) return false;
    if (book.upgraded.has(sym)) return false;
    return (book.attempts.get(sym) ?? 0) < book.maxAttempts;
  });
}

/** Symbols worth one delayed retry: they timed out upstream and have attempts left. */
export function retryableSymbols(
  errors: CompositeBatchResponse["errors"],
  book: Pick<UpgradeBook, "noFeed" | "attempts" | "maxAttempts">
): string[] {
  return errors
    .map((e) => e.symbol.toUpperCase())
    .filter((s) => !book.noFeed.has(s) && (book.attempts.get(s) ?? 0) < book.maxAttempts);
}

/** The visible page, then watched stocks that exist, each once. */
export function upgradeQueue(visible: Ticker[], watchlist: string[], tickers: Ticker[]): string[] {
  const bySym = new Map(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  const watched = watchlist
    .map((s) => bySym.get(s.toUpperCase()))
    .filter((t): t is Ticker => !!t);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...visible, ...watched]) {
    const sym = t.symbol.toUpperCase();
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push(t.symbol);
  }
  return out;
}

/** The watchlist panel's price shape. */
export function watchlistPriceData(cards: CardMap): Record<string, WatchlistPrice> {
  const out: Record<string, WatchlistPrice> = {};
  for (const [sym, c] of Object.entries(cards)) {
    if (c.price === undefined) continue;
    out[sym] = {
      price: c.price,
      change: c.change ?? 0,
      changePct: c.changePct ?? 0,
      sparkline: c.sparkline ?? [],
    };
  }
  return out;
}
