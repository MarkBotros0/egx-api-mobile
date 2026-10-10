import { indicatorRows, priceRows, volumeRows, type ChartAnalysis } from "../analysisRows";

const nulls = (n: number) => Array.from({ length: n }, () => null);

const analysis: ChartAnalysis = {
  ohlcv: {
    dates: ["2026-03-01", "2026-03-02", "2026-03-03"],
    open: [10, 10.5, 10.4],
    high: [10.6, 10.9, 10.8],
    low: [9.9, 10.2, 10.1],
    close: [10.4, 10.3, 10.7],
    volume: [1000, 2000, 3000],
  },
  indicators: {
    sma_20: nulls(3), sma_50: nulls(3), sma_200: nulls(3), ema_12: nulls(3), ema_26: nulls(3),
    bollinger_upper: [null, 11, 11.2], bollinger_middle: [null, 10.4, 10.5], bollinger_lower: [null, 9.8, 9.8],
    rsi: [null, 45, 55], macd_line: nulls(3), macd_signal: nulls(3), macd_histogram: nulls(3),
    stochastic_k: nulls(3), stochastic_d: nulls(3), obv: [0, -2000, 1000],
  },
  trendlines: {
    support: { values: [null, 10.1, 10.2], anchors: [], direction: "up", slope_pct_per_bar: 1 },
    resistance: null,
  },
};

describe("analysis row builders (port of the web stock page)", () => {
  it("zips ohlcv, overlays and trendline values by bar", () => {
    const rows = priceRows(analysis);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ date: "2026-03-02", close: 10.3, bollinger_upper: 11, trend_support: 10.1, trend_resistance: null });
    expect(rows[0].trend_support).toBeNull();
  });

  it("treats a missing trendlines object as no lines", () => {
    const rows = priceRows({ ...analysis, trendlines: null });
    expect(rows.every((r) => r.trend_support === null && r.trend_resistance === null)).toBe(true);
  });

  it("gives each volume bar the previous session's close", () => {
    const rows = volumeRows(analysis);
    expect(rows[0].prevClose).toBeUndefined();
    expect(rows[2]).toMatchObject({ volume: 3000, close: 10.7, prevClose: 10.3 });
  });

  it("zips the oscillators by bar", () => {
    expect(indicatorRows(analysis)[1]).toMatchObject({ date: "2026-03-02", rsi: 45, obv: -2000 });
  });
});
