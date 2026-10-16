/**
 * Parsing for the three money fields (buy price, sell price, dividend amount)
 * and the two share fields (quantity, dividend shares).
 *
 * The rules are the MARKET's (`/api/markets` share_decimals / price_decimals):
 * - EG: prices to THREE decimals (CIEB at 27.697) — the dividend amount is
 *   whatever landed after withholding, so it is rarely round; the web shipped
 *   `step={0.01}` once and the browser rejected real prices. Shares are whole:
 *   the EGX has no fractional shares — never parseInt("5.7"), which would
 *   silently record 5.
 * - US: prices to four decimals (average costs on fractional buys, sub-$1
 *   quotes) and fractional shares to six, as US brokers hold them.
 */

import type { Market } from "@/shared/markets";

export const MONEY_DECIMALS = 3;

export interface InputRules {
  shareDecimals: number;
  priceDecimals: number;
}

/** EG's rules: the default, so every caller written before markets is unchanged. */
export const EG_INPUT_RULES: InputRules = { shareDecimals: 0, priceDecimals: MONEY_DECIMALS };

export function inputRules(market: Pick<Market, "code" | "share_decimals" | "price_decimals">): InputRules {
  const us = market.code === "US";
  return {
    shareDecimals: market.share_decimals ?? (us ? 6 : 0),
    priceDecimals: market.price_decimals ?? (us ? 4 : MONEY_DECIMALS),
  };
}

/** `error: null` means "empty — say nothing yet". */
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string | null };

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;
const ARABIC_DECIMAL_SEPARATOR = "٫";
const ARABIC_THOUSANDS_SEPARATOR = "٬";

/** Arabic-Indic and Persian digits -> Latin; Arabic decimal separator -> ".". */
export function normalizeNumeric(text: string): string {
  let out = "";
  for (const ch of text.trim()) {
    const code = ch.charCodeAt(0);
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      out += String(code - EXTENDED_ARABIC_INDIC_ZERO);
    } else if (ch === ARABIC_DECIMAL_SEPARATOR) {
      out += ".";
    } else {
      out += ch;
    }
  }
  return out;
}

export function parseMoney(text: string, priceDecimals: number = MONEY_DECIMALS): Parsed<number> {
  const s = normalizeNumeric(text);
  if (s === "") return { ok: false, error: null };
  // "1,200" is 1200 to one reader and 1.2 to another. Guessing wrong records a
  // price off by a factor of a thousand, so a comma is refused, not read.
  if (s.includes(",") || s.includes(ARABIC_THOUSANDS_SEPARATOR)) {
    return { ok: false, error: "Use a dot for decimals and no thousands separators" };
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) {
    return { ok: false, error: priceDecimals === MONEY_DECIMALS ? "Enter a number, e.g. 27.697" : "Enter a number, e.g. 187.25" };
  }
  const decimals = (s.split(".")[1] ?? "").replace(/0+$/, "").length;
  if (decimals > priceDecimals) return { ok: false, error: `Prices go to ${priceDecimals} decimals at most` };
  const value = Number(s);
  if (!(value > 0)) return { ok: false, error: "Must be more than 0" };
  return { ok: true, value };
}

export function parseShares(text: string, max?: number, shareDecimals: number = 0): Parsed<number> {
  const s = normalizeNumeric(text);
  if (s === "") return { ok: false, error: null };
  if (shareDecimals > 0) {
    if (s.includes(",") || s.includes(ARABIC_THOUSANDS_SEPARATOR)) {
      return { ok: false, error: "Use a dot for decimals and no thousands separators" };
    }
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { ok: false, error: "Enter a number of shares, e.g. 2.5" };
    const decimals = (s.split(".")[1] ?? "").replace(/0+$/, "").length;
    if (decimals > shareDecimals) return { ok: false, error: `Shares go to ${shareDecimals} decimals at most` };
    const frac = Number(s);
    if (!(frac > 0)) return { ok: false, error: "Must be more than 0" };
    // Compared at six places: a held 0.3 is not "less than" 0.1 + 0.2.
    if (max !== undefined && Math.round(frac * 1e6) > Math.round(max * 1e6)) {
      return { ok: false, error: `Enter up to ${max} shares` };
    }
    return { ok: true, value: frac };
  }
  if (!/^\d+$/.test(s)) return { ok: false, error: "Enter a whole number of shares" };
  const value = Number(s);
  if (max !== undefined && (value < 1 || value > max)) {
    return { ok: false, error: `Enter between 1 and ${max} shares` };
  }
  if (value < 1) return { ok: false, error: "Must be at least 1 share" };
  return { ok: true, value };
}
