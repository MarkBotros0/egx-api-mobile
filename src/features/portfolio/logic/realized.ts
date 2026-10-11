/**
 * Copy and choices for the realized section. Closed trades render from
 * `orders` (one submit = one line); money adds up across parts, rates do not,
 * so a multi-purchase order has no single holding period or annualized figure.
 */
import type { Dividend, SaleOrder } from "@/shared/types";
import { signed } from "./format";

export type RealizedTab = "sales" | "dividends" | "by_symbol";

export function initialRealizedTab(orders: SaleOrder[], dividends: Dividend[]): RealizedTab {
  return orders.length ? "sales" : dividends.length ? "dividends" : "by_symbol";
}

export function tBillLine(order: SaleOrder): string | null {
  if (order.annualized_return_pct === null) {
    return order.lots_count > 1 ? `Spans ${order.lots_count} purchases — see each below` : null;
  }
  const verdict = order.beat_t_bill ? "beat" : "lost to";
  const hurdle = order.t_bill_hurdle_pct;
  return `${signed(order.annualized_return_pct, 1)}%/yr — ${verdict} the ${
    hurdle !== null ? hurdle.toFixed(0) : "—"
  }% T-bill`;
}

export function heldLine(order: SaleOrder): string {
  if (order.days_held !== null) return `Held ${order.days_held} days`;
  const range = order.buy_date_latest !== order.buy_date ? ` – ${order.buy_date_latest}` : "";
  return `Bought ${order.buy_date}${range}`;
}

/** The backend falls back to the symbol for a missing name; "COMI COMI" says nothing. */
export function companyName(symbol: string, name: string | null | undefined): string | null {
  return name && name !== symbol ? name : null;
}

export function undoSaleMessage(symbol: string, parts: number): string {
  const reach = parts > 1 ? `, across all ${parts} purchases it sold from` : "";
  return `The ${symbol} sale will be removed from your winnings and the shares returned to your portfolio${reach}. If you deleted the holding itself, the shares cannot be restored.`;
}

export function removeDividendMessage(symbol: string): string {
  return `The ${symbol} dividend will be removed from your winnings. Your holdings are not affected.`;
}
