/**
 * Colour bands and copy for the analysis cards, ported from RiskDashboard,
 * PortfolioSummary and MacroCard on the web. The class
 * names are Tailwind strings NativeWind resolves; `yellow-400`/`green-400`
 * come from Tailwind's default palette.
 */
import {
  CURRENT_DD_CAUTION,
  CURRENT_DD_NEUTRAL,
  DD_CAUTION,
  DD_GOOD,
  SHARPE_GOOD,
  SHARPE_OKAY,
} from "@/shared/constants";
import { formatMoney } from "@/shared/money";
import type { MacroData, PortfolioMetrics } from "@/shared/types";
import { egp } from "./format";

const MUTED = "text-white/30";

export function sharpeTone(v: number | null): string {
  if (v == null) return MUTED;
  if (v > SHARPE_GOOD) return "text-gain";
  if (v > SHARPE_OKAY) return "text-green-400";
  if (v > 0) return "text-yellow-400";
  return "text-loss";
}

export function sortinoTone(v: number | null): string {
  if (v == null) return MUTED;
  if (v > SHARPE_GOOD) return "text-gain";
  if (v > 0) return "text-yellow-400";
  return "text-loss";
}

export function drawdownTone(v: number | null | undefined): string {
  if (v == null) return MUTED;
  if (v > DD_GOOD) return "text-gain";
  if (v > DD_CAUTION) return "text-yellow-400";
  return "text-loss";
}

export function currentDrawdownTone(v: number | null | undefined): string {
  if (v == null) return MUTED;
  if (v > CURRENT_DD_NEUTRAL) return "text-gain";
  if (v > CURRENT_DD_CAUTION) return "text-yellow-400";
  return "text-loss";
}

export function diversificationTone(score: number): string {
  if (score >= 70) return "text-gain";
  if (score >= 40) return "text-yellow-400";
  return "text-loss";
}

export interface DirectionArrow {
  glyph: "↑" | "↓" | "→";
  className: string;
}

/**
 * "Up" means opposite things here: a rising EGX30 is good, a rising USD/EGP
 * is the pound weakening, and the CBE rate is context (neutral).
 */
export function directionArrow(
  direction: string | null,
  opts: { positiveIsGood?: boolean; neutral?: boolean } = {},
): DirectionArrow {
  if (direction !== "up" && direction !== "down") return { glyph: "→", className: "text-white/30" };
  const glyph = direction === "up" ? "↑" : "↓";
  if (opts.neutral) return { glyph, className: "text-white/40" };
  const positiveIsGood = opts.positiveIsGood ?? true;
  const good = direction === "up" ? positiveIsGood : !positiveIsGood;
  return { glyph, className: good ? "text-gain" : "text-loss" };
}

export function macroDetails(data: MacroData): { rate?: string; fx?: string; egx30?: string } {
  const out: { rate?: string; fx?: string; egx30?: string } = {};
  const rate = data.interest_rate?.value;
  if (rate) {
    out.rate = rate >= 20 ? "High rates make T-bills attractive vs stocks" : "Moderate rates favor stock investing";
  }
  const fx = data.usd_egp;
  if (fx?.direction === "up") out.fx = "Weakening EGP benefits exporters, hurts importers";
  else if (fx?.direction === "down") out.fx = "Strengthening EGP benefits importers";
  else if (fx?.value) out.fx = "Currency stability supports the market";
  const month = data.egx30?.monthly_change_pct;
  if (month != null) out.egx30 = `${month > 0 ? "+" : ""}${month.toFixed(1)}% this month`;
  return out;
}

export function formatMacroValue(v: number): string {
  return v > 1000 ? egp(v) : String(v);
}

/** Totals cover only priced holdings; silently dropping one used to show a phantom loss. */
export function excludedNotice(m: PortfolioMetrics, currency: string): string | null {
  const n = m.excluded_count;
  if (!n) return null;
  const basis = m.excluded_invested > 0 ? ` (${formatMoney(m.excluded_invested, currency, { digits: 0 })} of cost basis)` : "";
  return `${n} holding${n > 1 ? "s" : ""} could not be priced and ${n > 1 ? "are" : "is"} left out of these totals${basis}. The figures below describe the rest of your portfolio.`;
}
