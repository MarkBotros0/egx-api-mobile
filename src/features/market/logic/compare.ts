import {
  COMPARE_DEFAULT_LOOKBACK_MONTHS,
  COMPARE_SUGGESTIONS_LIMIT,
  MAX_COMPARE_SYMBOLS,
  MIN_COMPARE_SYMBOLS,
} from "@/shared/constants";
import type { CompareResponse, Ticker } from "@/shared/types";
import { localDateKey } from "./marketClock";

/** Strict YYYY-MM-DD that names a real calendar day (the web used <input type="date">). */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** `months` back from `now`, both ends as LOCAL dates. */
export function rangeEndingAt(now: Date, months: number): { start: string; end: string } {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return { start: localDateKey(d), end: localDateKey(now) };
}

export function defaultCompareRange(now: Date) {
  return rangeEndingAt(now, COMPARE_DEFAULT_LOOKBACK_MONTHS);
}

/** One-tap ranges that make the typed date field bearable on a phone. */
export const RANGE_PRESETS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
] as const;

export function compareRangeError(start: string, end: string): string | null {
  if (!isIsoDate(start)) return "Start date must be YYYY-MM-DD";
  if (!isIsoDate(end)) return "End date must be YYYY-MM-DD";
  if (start > end) return "Start date must be on or before the end date";
  return null;
}

export function compareSuggestions(
  tickers: Ticker[],
  input: string,
  selected: string[],
  limit: number = COMPARE_SUGGESTIONS_LIMIT
): Ticker[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  return tickers
    .filter(
      (t) =>
        !selected.includes(t.symbol) &&
        (t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function addCompareSymbol(selected: string[], sym: string, max: number = MAX_COMPARE_SYMBOLS): string[] {
  if (selected.length >= max || selected.includes(sym)) return selected;
  return [...selected, sym];
}

export function canCompare(selected: string[], start: string, end: string): boolean {
  return selected.length >= MIN_COMPARE_SYMBOLS && compareRangeError(start, end) === null;
}

export interface CompareSeries {
  symbol: string;
  values: (number | null)[];
}

/** The chart's series, in selection order; a symbol the response lacks is skipped. */
export function buildCompareSeries(data: CompareResponse | null, selected: string[]): CompareSeries[] {
  if (!data) return [];
  return selected
    .filter((sym) => Array.isArray(data[sym]))
    .map((sym) => ({ symbol: sym, values: data[sym] as (number | null)[] }));
}
