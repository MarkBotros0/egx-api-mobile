/**
 * Dividend form rules. A dividend is anchored to the SYMBOL (no holding_id),
 * so it can be recorded against a position already sold out — the options are
 * open holdings plus every symbol with a sale. `amount` is what actually
 * landed, net of withholding tax; `shares` is optional and display-only.
 */
import type { PortfolioHolding, Sale } from "@/shared/types";
import { todayIso } from "@/lib/dates";
import { EG_INPUT_RULES, parseMoney, parseShares, type InputRules } from "./money";

export interface DividendSymbolOption {
  symbol: string;
  name: string;
  sector: string;
  /** Shares held now, for an open position; null for a sold-out symbol. */
  shares: number | null;
}

export function dividendSymbolOptions(
  sales: Sale[] = [],
  holdings: PortfolioHolding[] = [],
): DividendSymbolOption[] {
  const map = new Map<string, DividendSymbolOption>();
  for (const s of sales) {
    map.set(s.symbol, { symbol: s.symbol, name: s.name, sector: s.sector, shares: null });
  }
  // Open holdings win, with the POSITION's share count — the sum of its lots.
  // (The web set it from whichever lot came last, i.e. one purchase's count.)
  const open = new Map<string, DividendSymbolOption>();
  for (const h of holdings) {
    const prev = open.get(h.symbol);
    open.set(h.symbol, {
      symbol: h.symbol,
      name: h.name || h.symbol,
      sector: h.sector ?? "",
      shares: (prev?.shares ?? 0) + h.quantity,
    });
  }
  for (const [symbol, option] of open) map.set(symbol, option);
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function presetSharesText(options: DividendSymbolOption[], symbol: string): string {
  const shares = options.find((o) => o.symbol === symbol)?.shares;
  return shares != null ? String(shares) : "";
}

export interface DividendPayload {
  symbol: string;
  name: string;
  sector: string;
  amount: number;
  pay_date: string;
  shares: number | null;
  notes: string;
}

export interface DividendFormErrors {
  symbol: string | null;
  amount: string | null;
  shares: string | null;
  date: string | null;
}

export function buildDividendPayload(input: {
  symbol: string;
  options: DividendSymbolOption[];
  amountText: string;
  payDate: string;
  sharesText: string;
  notes: string;
  today?: string;
  rules?: InputRules;
}): { ok: true; payload: DividendPayload } | { ok: false; errors: DividendFormErrors } {
  const rules = input.rules ?? EG_INPUT_RULES;
  const amount = parseMoney(input.amountText, rules.priceDecimals);
  const sharesBlank = input.sharesText.trim() === "";
  const shares = sharesBlank ? null : parseShares(input.sharesText, undefined, rules.shareDecimals);
  const today = input.today ?? todayIso();
  const errors: DividendFormErrors = {
    symbol: input.symbol ? null : "Pick a stock",
    amount: amount.ok ? null : amount.error,
    shares: shares && !shares.ok ? shares.error : null,
    date: !input.payDate
      ? "Pick a pay date"
      : input.payDate > today
        ? "The pay date cannot be in the future"
        : null,
  };
  if (!input.symbol || !amount.ok || (shares && !shares.ok) || errors.date) {
    return { ok: false, errors };
  }
  const picked = input.options.find((o) => o.symbol === input.symbol);
  return {
    ok: true,
    payload: {
      symbol: input.symbol,
      name: picked?.name ?? input.symbol,
      sector: picked?.sector ?? "",
      amount: amount.value,
      pay_date: input.payDate,
      shares: shares && shares.ok ? shares.value : null,
      notes: input.notes,
    },
  };
}

export function perShareAmount(amountText: string, sharesText: string, rules: InputRules = EG_INPUT_RULES): number | null {
  const amount = parseMoney(amountText, rules.priceDecimals);
  const shares = parseShares(sharesText, undefined, rules.shareDecimals);
  return amount.ok && shares.ok ? amount.value / shares.value : null;
}
