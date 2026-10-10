import type { AnalysisIndicators, AnalysisOHLCV, TrendLines } from "@/shared/types";

import type { IndicatorDataPoint } from "./IndicatorPanel";
import type { PriceDataPoint } from "./PriceChart";
import type { VolumeDataPoint } from "./VolumeChart";

export type ChartIndicatorKey =
  | "sma_20" | "sma_50" | "sma_200" | "ema_12" | "ema_26"
  | "bollinger_upper" | "bollinger_middle" | "bollinger_lower"
  | "rsi" | "macd_line" | "macd_signal" | "macd_histogram"
  | "stochastic_k" | "stochastic_d" | "obv";

/** The slice of AnalysisResponse the charts read. An AnalysisResponse satisfies it. */
export interface ChartAnalysis {
  ohlcv: AnalysisOHLCV;
  indicators: Pick<AnalysisIndicators, ChartIndicatorKey>;
  trendlines?: TrendLines | null;
}

export function priceRows(a: ChartAnalysis): PriceDataPoint[] {
  const { ohlcv, indicators: ind } = a;
  return ohlcv.dates.map((date, i) => ({
    date,
    close: ohlcv.close[i],
    open: ohlcv.open[i],
    high: ohlcv.high[i],
    low: ohlcv.low[i],
    sma_20: ind.sma_20[i],
    sma_50: ind.sma_50[i],
    sma_200: ind.sma_200[i],
    ema_12: ind.ema_12[i],
    ema_26: ind.ema_26[i],
    bollinger_upper: ind.bollinger_upper[i],
    bollinger_middle: ind.bollinger_middle[i],
    bollinger_lower: ind.bollinger_lower[i],
    // Aligned to ohlcv.dates by the backend; null before the first anchor
    // and for a side that was not drawn.
    trend_support: a.trendlines?.support?.values[i] ?? null,
    trend_resistance: a.trendlines?.resistance?.values[i] ?? null,
  }));
}

export function volumeRows(a: ChartAnalysis): VolumeDataPoint[] {
  const { ohlcv } = a;
  return ohlcv.dates.map((date, i) => ({
    date,
    volume: ohlcv.volume[i],
    close: ohlcv.close[i],
    open: ohlcv.open[i],
    // Bars are coloured by close-vs-previous-close.
    prevClose: i > 0 ? ohlcv.close[i - 1] : undefined,
  }));
}

export function indicatorRows(a: ChartAnalysis): IndicatorDataPoint[] {
  const { ohlcv, indicators: ind } = a;
  return ohlcv.dates.map((date, i) => ({
    date,
    rsi: ind.rsi[i],
    macd_line: ind.macd_line[i],
    macd_signal: ind.macd_signal[i],
    macd_histogram: ind.macd_histogram[i],
    stochastic_k: ind.stochastic_k[i],
    stochastic_d: ind.stochastic_d[i],
    obv: ind.obv[i],
  }));
}
