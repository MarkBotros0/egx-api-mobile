/**
 * Page state and FAB placement. See the plan's Task 5 for the derivation; the
 * short version: the FAB clears whatever part of the bottom obstruction (tab
 * bar incl. inset, or the bare home indicator) overlaps this screen.
 */
import type { Portfolio, SalesResponse } from "@/shared/types";

export const FAB_SIZE = 56;
export const FAB_GAP = 12;

export function fabBottomOffset(p: {
  windowHeight: number;
  sceneBottom: number;
  tabBarHeight: number;
  insetBottom: number;
  gap?: number;
}): number {
  const gap = p.gap ?? FAB_GAP;
  const obstruction = Math.max(p.tabBarHeight, p.insetBottom);
  const overlap = Math.max(0, p.sceneBottom - (p.windowHeight - obstruction));
  return Math.round(overlap + gap);
}

export function contentSpacer(fabBottom: number): number {
  return fabBottom + FAB_SIZE + 8;
}

export type PortfolioView = "loading" | "error" | "empty" | "sold_out" | "holdings";

export function portfolioView(s: {
  portfolioLoading: boolean;
  portfolio: Portfolio | null;
  salesLoaded: boolean;
  salesError: string | null;
  sales: SalesResponse | null;
}): PortfolioView {
  // No portfolio yet: still loading, or the load FAILED. A failed load says
  // nothing about what the user owns, so it must never fall through to "empty".
  if (!s.portfolio) return s.portfolioLoading ? "loading" : "error";
  if ((s.portfolio?.portfolio.length ?? 0) > 0) return "holdings";
  // "Never traded" needs PROOF: sales loaded, no error, and both ledgers empty.
  const neverTraded =
    s.salesLoaded &&
    !s.salesError &&
    s.sales !== null &&
    s.sales.sales.length === 0 &&
    (s.sales.dividends ?? []).length === 0;
  return neverTraded ? "empty" : "sold_out";
}
