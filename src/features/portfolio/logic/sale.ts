/**
 * A sale comes out of the POSITION and may span several purchase lots. The
 * backend consumes them oldest-first and re-plans authoritatively; this is the
 * preview, and the realized figure MUST be summed over the parts:
 * (price - average) x qty is only right when the sale consumes every lot.
 */
import { planSale, type SalePart } from "@/shared/positions";
import type { PortfolioHolding } from "@/shared/types";
import { roundShares } from "@/shared/positions";
import { EG_INPUT_RULES, parseMoney, parseShares, type InputRules, type Parsed } from "./money";

export interface SellPosition {
  symbol: string;
  name: string;
  /** Every open lot of the symbol, oldest purchase first. */
  lots: SalePart[];
}

export interface SaleSubmit {
  quantity: number;
  sell_price: number;
  sell_date: string;
  notes: string;
}

export function sellPositionFor(
  holdings: PortfolioHolding[] | undefined,
  symbol: string | null,
): SellPosition | null {
  if (!symbol) return null;
  const rows = (holdings ?? []).filter((h) => h.symbol === symbol && h.quantity > 0 && h.id);
  if (!rows.length) return null;
  const lots = rows
    .map((h) => ({ id: h.id, quantity: h.quantity, buy_price: h.buy_price, buy_date: h.buy_date }))
    .sort((a, b) => (a.buy_date || "").localeCompare(b.buy_date || ""));
  return { symbol, name: rows[0].name || symbol, lots };
}

export interface SalePartPreview extends SalePart {
  /** Realized on this part at the typed price; null until a price is valid. */
  pnl: number | null;
}

export interface SalePreview {
  held: number;
  avgBuyPrice: number;
  multiLot: boolean;
  quantity: Parsed<number>;
  price: Parsed<number>;
  parts: SalePartPreview[];
  pnl: number | null;
  pnlPct: number | null;
  /** The newest purchase this sale reaches; the backend rejects anything earlier. */
  earliestSellDate: string;
}

export function previewSale(
  position: SellPosition,
  quantityText: string,
  priceText: string,
  rules: InputRules = EG_INPUT_RULES
): SalePreview {
  const held = roundShares(position.lots.reduce((n, l) => n + l.quantity, 0));
  const cost = position.lots.reduce((n, l) => n + l.buy_price * l.quantity, 0);
  const quantity = parseShares(quantityText, held, rules.shareDecimals);
  const price = parseMoney(priceText, rules.priceDecimals);

  const plan = quantity.ok ? planSale(position.lots, quantity.value) : [];
  const parts: SalePartPreview[] = plan.map((part) => ({
    ...part,
    pnl: price.ok ? (price.value - part.buy_price) * part.quantity : null,
  }));
  const pnl = quantity.ok && price.ok ? parts.reduce((n, p) => n + (p.pnl ?? 0), 0) : null;
  const planCost = plan.reduce((n, p) => n + p.buy_price * p.quantity, 0);

  const earliestSellDate = plan.length
    ? plan.reduce((d, p) => (p.buy_date > d ? p.buy_date : d), "")
    : position.lots.reduce((d, l) => (!d || l.buy_date < d ? l.buy_date : d), "");

  return {
    held,
    avgBuyPrice: held > 0 ? cost / held : 0,
    multiLot: position.lots.length > 1,
    quantity,
    price,
    parts,
    pnl,
    pnlPct: pnl !== null && planCost > 0 ? (pnl / planCost) * 100 : null,
    earliestSellDate,
  };
}

export function sellDateError(
  sellDate: string,
  earliest: string,
  today: string,
  multiLot: boolean,
): string | null {
  if (!sellDate) return "Pick a sell date";
  if (sellDate > today) return "The sell date cannot be in the future";
  if (earliest && sellDate < earliest) {
    return multiLot
      ? `This sale reaches a purchase made on ${earliest} — sell on or after that date`
      : `Sell on or after the buy date (${earliest})`;
  }
  return null;
}
