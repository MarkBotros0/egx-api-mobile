import type { Href } from "expo-router";

/**
 * The stock page, opened on the interval its dashboard card was scored on —
 * the web card's `/stock/X?interval=Y`. An object Href so typed routes accept
 * the query param.
 */
export function stockDetailHref(symbol: string, interval?: string): Href {
  const sym = symbol.toUpperCase();
  return {
    pathname: "/stock/[symbol]",
    params: interval ? { symbol: sym, interval } : { symbol: sym },
  } as Href;
}
