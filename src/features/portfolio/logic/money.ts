/**
 * Parsing for the three money fields (buy price, sell price, dividend amount)
 * and the two share fields (quantity, dividend shares).
 *
 * EGX quotes to THREE decimals (CIEB at 27.697), and the dividend amount is
 * whatever landed after 5-10% withholding, so it is rarely round. The web
 * shipped `step={0.01}` once and the browser rejected real prices; this is the
 * mobile equivalent of `step="any"` plus an explicit 3-decimal ceiling.
 *
 * EGX has no fractional shares, so share fields are integers — never
 * parseInt("5.7"), which would silently record 5.
 */

export const MONEY_DECIMALS = 3;

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

export function parseMoney(text: string): Parsed<number> {
  const s = normalizeNumeric(text);
  if (s === "") return { ok: false, error: null };
  // "1,200" is 1200 to one reader and 1.2 to another. Guessing wrong records a
  // price off by a factor of a thousand, so a comma is refused, not read.
  if (s.includes(",") || s.includes(ARABIC_THOUSANDS_SEPARATOR)) {
    return { ok: false, error: "Use a dot for decimals and no thousands separators" };
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { ok: false, error: "Enter a number, e.g. 27.697" };
  const decimals = (s.split(".")[1] ?? "").replace(/0+$/, "").length;
  if (decimals > MONEY_DECIMALS) return { ok: false, error: "EGX prices go to 3 decimals at most" };
  const value = Number(s);
  if (!(value > 0)) return { ok: false, error: "Must be more than 0" };
  return { ok: true, value };
}

export function parseShares(text: string, max?: number): Parsed<number> {
  const s = normalizeNumeric(text);
  if (s === "") return { ok: false, error: null };
  if (!/^\d+$/.test(s)) return { ok: false, error: "Enter a whole number of shares" };
  const value = Number(s);
  if (max !== undefined && (value < 1 || value > max)) {
    return { ok: false, error: `Enter between 1 and ${max} shares` };
  }
  if (value < 1) return { ok: false, error: "Must be at least 1 share" };
  return { ok: true, value };
}
