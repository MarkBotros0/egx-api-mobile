/**
 * Add/Edit holding form rules. The form is deliberately down to symbol,
 * quantity, buy price and buy date (web, 2026-09-01). Target, stop-loss and
 * notes are still stored and still drive signals, so an edit carries them
 * through untouched — nothing here can set or clear them.
 */
import { TICKER_SEARCH_LIMIT } from "@/shared/constants";
import type { PortfolioHolding, Ticker } from "@/shared/types";
import { todayIso } from "./format";
import { parseMoney, parseShares } from "./money";

export type TickerValidation = "idle" | "validating" | "valid" | "invalid" | "error";

export interface ResolvedTicker {
  symbol: string;
  name: string;
  sector: string;
}

export interface HoldingInitialValues {
  symbol: string;
  name?: string;
  sector?: string;
  buy_price?: number;
  buy_date?: string;
  quantity?: number;
  target_price?: number | null;
  stop_loss?: number | null;
  notes?: string;
}

export type HoldingPayload = Omit<PortfolioHolding, "id" | "created_at" | "updated_at">;

export function filterTickers(tickers: Ticker[], search: string, limit = TICKER_SEARCH_LIMIT): Ticker[] {
  const q = search.trim().toLowerCase();
  if (!q) return tickers.slice(0, limit);
  return tickers
    .filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    .slice(0, limit);
}

export function findKnownTicker(tickers: Ticker[], text: string): Ticker | undefined {
  const sym = text.trim().toUpperCase();
  if (!sym) return undefined;
  return tickers.find((t) => t.symbol.toUpperCase() === sym);
}

/**
 * The ticker an edit starts from. When the ticker list has not loaded (or does
 * not carry the symbol) it falls back to what the HOLDING stores. The web form
 * fell back to name = symbol, sector = "Unknown" here, and the edit then wrote
 * those over the stored company name and sector.
 */
export function initialTicker(tickers: Ticker[], initial?: HoldingInitialValues): ResolvedTicker | null {
  if (!initial?.symbol) return null;
  const known = findKnownTicker(tickers, initial.symbol);
  if (known) return { symbol: known.symbol, name: known.name, sector: known.sector };
  return {
    symbol: initial.symbol,
    name: initial.name || initial.symbol,
    sector: initial.sector || "Unknown",
  };
}

export interface HoldingFormErrors {
  quantity: string | null;
  price: string | null;
  date: string | null;
}

export function buildHoldingPayload(input: {
  ticker: ResolvedTicker | null;
  quantityText: string;
  priceText: string;
  buyDate: string;
  initial?: HoldingInitialValues;
  today?: string;
}): { ok: true; payload: HoldingPayload } | { ok: false; errors: HoldingFormErrors } {
  const quantity = parseShares(input.quantityText);
  const price = parseMoney(input.priceText);
  const today = input.today ?? todayIso();
  const date = !input.buyDate
    ? "Pick a buy date"
    : input.buyDate > today
      ? "The buy date cannot be in the future"
      : null;

  if (!input.ticker || !quantity.ok || !price.ok || date) {
    return {
      ok: false,
      errors: {
        quantity: quantity.ok ? null : quantity.error,
        price: price.ok ? null : price.error,
        date,
      },
    };
  }

  return {
    ok: true,
    payload: {
      symbol: input.ticker.symbol,
      name: input.ticker.name,
      sector: input.ticker.sector,
      buy_price: price.value,
      buy_date: input.buyDate,
      quantity: quantity.value,
      target_price: input.initial?.target_price ?? null,
      stop_loss: input.initial?.stop_loss ?? null,
      notes: input.initial?.notes ?? "",
    },
  };
}
