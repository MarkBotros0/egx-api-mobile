import type { AnalysisResponse } from "@/shared/types";

export const INTERVALS = ["Daily", "Weekly", "Monthly"] as const;
export type ChartInterval = (typeof INTERVALS)[number];

export const BAR_COUNTS = [60, 100, 200, 500] as const;
export type BarCount = (typeof BAR_COUNTS)[number];
export const DEFAULT_BARS: BarCount = 200;

/** `?interval=` from a dashboard card. Daily is the fallback and the normal case. */
export function parseInterval(q: string | string[] | undefined): ChartInterval {
  const v = Array.isArray(q) ? q[0] : q;
  return (INTERVALS as readonly string[]).includes(v ?? "") ? (v as ChartInterval) : "Daily";
}

/**
 * Chart-only overlays (copied from the web stock page). They draw a line and
 * change nothing else. Trendlines is neutral on purpose: its lines are
 * support-green and resistance-red, so the pill must not claim a side.
 */
export const OVERLAYS = [
  { key: "sma20", label: "SMA 20", color: "#ffaa00" },
  { key: "sma50", label: "SMA 50", color: "#ff6600" },
  { key: "sma200", label: "SMA 200", color: "#ff0066" },
  { key: "ema12", label: "EMA 12", color: "#00ccff" },
  { key: "ema26", label: "EMA 26", color: "#cc00ff" },
  { key: "bollinger", label: "Bollinger", color: "#4488ff" },
  { key: "trendlines", label: "Trendlines", color: "#d8dce8" },
] as const;

export type OverlayKey = (typeof OVERLAYS)[number]["key"];
export type OverlayState = Record<OverlayKey, boolean>;

export const DEFAULT_OVERLAYS: OverlayState = {
  sma20: true,
  sma50: false,
  sma200: false,
  ema12: false,
  ema26: false,
  bollinger: false,
  trendlines: true,
};

export function overlayExplanation(key: OverlayKey, label: string): string {
  if (key === "trendlines") {
    return "A straight line through the last three pivot lows (green, support) and the last three pivot highs (red, resistance), extended to today — the lines a chartist draws by hand. Drawn only when the pivots line up in one direction and price has respected the line; a choppy stock gets none. A pivot needs 20 bars after it, so the newest anchor is always about a month old.";
  }
  if (key === "sma200") {
    return "200-day SMA — the most important long-term trend indicator. Used for Golden Cross / Death Cross signals.";
  }
  if (key.startsWith("sma")) {
    return `Simple Moving Average (${label.split(" ")[1]}-day). Shows the average price over the period. Price above SMA = bullish trend.`;
  }
  if (key.startsWith("ema")) {
    return `Exponential Moving Average (${label.split(" ")[1]}-day). Like SMA but reacts faster to recent price changes.`;
  }
  return "Bollinger Bands show volatility. When bands squeeze = big move coming. Price at upper band = possibly overbought.";
}

export function latestNonNull(values: (number | null)[] | undefined): number | null {
  if (!values) return null;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return v;
  }
  return null;
}

export function atrPercent(atr: number | null, price: number | undefined): number | null {
  if (!atr || !price) return null;
  return Math.round((atr / price) * 1000) / 10;
}

export type CalloutTone = "gain" | "loss" | "accent" | "neutral";
export interface Callout {
  key: string;
  label: string;
  tone: CalloutTone;
}

/** The pills under the composite card (divergences, timeframe alignment, squeeze). */
export function compositeCallouts(
  d: Pick<AnalysisResponse, "divergences" | "multi_timeframe" | "bb_squeeze">
): Callout[] {
  const out: Callout[] = [];
  if (d.divergences?.rsi?.bullish) out.push({ key: "rsi-bull", label: "🔄 RSI bullish divergence", tone: "gain" });
  if (d.divergences?.rsi?.bearish) out.push({ key: "rsi-bear", label: "🔄 RSI bearish divergence", tone: "loss" });
  if (d.divergences?.macd?.bullish) out.push({ key: "macd-bull", label: "🔄 MACD bullish divergence", tone: "gain" });
  if (d.divergences?.macd?.bearish) out.push({ key: "macd-bear", label: "🔄 MACD bearish divergence", tone: "loss" });
  const mt = d.multi_timeframe;
  if (mt?.aligned) {
    out.push({ key: "aligned", label: `✅ Daily + Weekly aligned (${mt.daily_trend})`, tone: "accent" });
  } else if (mt && mt.daily_trend !== "sideways" && mt.weekly_trend !== "sideways") {
    out.push({
      key: "mixed",
      label: `⚠️ Daily ${mt.daily_trend} vs Weekly ${mt.weekly_trend} — mixed signals`,
      tone: "neutral",
    });
  }
  if (d.bb_squeeze) out.push({ key: "squeeze", label: "🔔 Bollinger squeeze — breakout likely", tone: "accent" });
  return out;
}
