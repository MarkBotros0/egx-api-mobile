import { PRICE_OVERLAY_COLORS } from "@/charts";
import { makeAnalysis } from "@/features/market/testing/fixtures";
import {
  atrPercent,
  compositeCallouts,
  DEFAULT_OVERLAYS,
  latestNonNull,
  OVERLAYS,
  overlayExplanation,
  parseInterval,
} from "../stockDetail";

describe("parseInterval", () => {
  it("accepts the three intervals and falls back to Daily", () => {
    expect(parseInterval("Weekly")).toBe("Weekly");
    expect(parseInterval(["Monthly", "x"])).toBe("Monthly");
    expect(parseInterval("Hourly")).toBe("Daily");
    expect(parseInterval(undefined)).toBe("Daily");
  });
});

describe("overlays", () => {
  it("uses the chart kit's colours for the five moving averages", () => {
    for (const k of ["sma20", "sma50", "sma200", "ema12", "ema26"] as const) {
      expect(OVERLAYS.find((o) => o.key === k)?.color).toBe(PRICE_OVERLAY_COLORS[k]);
    }
  });
  it("starts with SMA 20 and Trendlines on", () => {
    expect(DEFAULT_OVERLAYS).toEqual({
      sma20: true, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, trendlines: true,
    });
  });
  it("explains each overlay", () => {
    expect(overlayExplanation("sma50", "SMA 50")).toContain("(50-day)");
    expect(overlayExplanation("ema12", "EMA 12")).toContain("Exponential Moving Average (12-day)");
    expect(overlayExplanation("sma200", "SMA 200")).toContain("Golden Cross");
    expect(overlayExplanation("trendlines", "Trendlines")).toContain("three pivot lows");
    expect(overlayExplanation("bollinger", "Bollinger")).toContain("volatility");
  });
});

describe("latestNonNull and atrPercent", () => {
  it("reads the newest real value", () => {
    expect(latestNonNull([1, 2, null])).toBe(2);
    expect(latestNonNull([null, null])).toBeNull();
    expect(latestNonNull(undefined)).toBeNull();
  });
  it("expresses ATR as a percent of price to one decimal", () => {
    expect(atrPercent(2.06, 82.5)).toBe(2.5);
    expect(atrPercent(null, 82.5)).toBeNull();
    expect(atrPercent(2, undefined)).toBeNull();
  });
});

describe("compositeCallouts", () => {
  it("names alignment, divergences and squeezes, in direction colours", () => {
    const d = makeAnalysis({
      divergences: {
        rsi: { bullish: true, bearish: false, hidden_bullish: false, hidden_bearish: false, detail: null },
        macd: { bullish: false, bearish: true, hidden_bullish: false, hidden_bearish: false, detail: null },
      },
      bb_squeeze: true,
    });
    expect(compositeCallouts(d)).toEqual([
      { key: "rsi-bull", label: "🔄 RSI bullish divergence", tone: "gain" },
      { key: "macd-bear", label: "🔄 MACD bearish divergence", tone: "loss" },
      { key: "aligned", label: "✅ Daily + Weekly aligned (up)", tone: "accent" },
      { key: "squeeze", label: "🔔 Bollinger squeeze — breakout likely", tone: "accent" },
    ]);
  });
  it("flags mixed timeframes but not a sideways one", () => {
    const mixed = makeAnalysis({ multi_timeframe: { daily_trend: "up", weekly_trend: "down", aligned: false, alignment_score: 0 } });
    expect(compositeCallouts(mixed)).toEqual([
      { key: "mixed", label: "⚠️ Daily up vs Weekly down — mixed signals", tone: "neutral" },
    ]);
    const sideways = makeAnalysis({ multi_timeframe: { daily_trend: "sideways", weekly_trend: "down", aligned: false, alignment_score: 0 } });
    expect(compositeCallouts(sideways)).toEqual([]);
  });
});
