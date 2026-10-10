import type { CompositeBatchResponse, DashboardResponse, DashboardRow, MarketRegime, RiskResponse } from "@/shared/api";
import type {
  AnalysisResponse,
  CategoryScore,
  CompareResponse,
  DivergenceInfo,
  DividendCalendarResponse,
  DividendHistoryResponse,
  EntryExit,
  ForecastCalibration,
  KeyLevels,
  NewsResponse,
  StockForecast,
  Ticker,
} from "@/shared/types";

/** Test data shared by every market test. Not a test file. */

export const TICKERS: Ticker[] = [
  { symbol: "COMI", name: "Commercial International Bank", sector: "Banking", index: "EGX30" },
  { symbol: "TMGH", name: "Talaat Moustafa Group", sector: "Real Estate", index: "EGX30" },
  { symbol: "ETEL", name: "Telecom Egypt", sector: "Telecommunications", index: "EGX30" },
  { symbol: "ABUK", name: "Abu Qir Fertilizers", sector: "Basic Materials", index: "EGX30" },
  { symbol: "MEGM", name: "Middle East Glass", sector: "Industrials", index: "EGX70" },
  { symbol: "ACGC", name: "Arab Cotton Ginning", sector: "Consumer Goods", index: "EGX70" },
];

export function makeDashboardRow(symbol: string, o: Partial<DashboardRow> = {}): DashboardRow {
  return {
    symbol,
    available: true,
    score: 55,
    signal: "Neutral",
    price: 10,
    change: 0.1,
    change_pct: 1,
    sparkline: [9, 9.5, 10],
    measured_at: "2026-09-02T20:33:28Z",
    scored_at: "2026-09-02T20:35:00Z",
    last_bar_date: "2026-09-02",
    tradeable: true,
    sigma_63_ann_pct: 30,
    risk_band: "average",
    risk_band_label: "Average",
    dividend_yield: 0,
    dividend_ex_date_recent: null,
    ...o,
  };
}

export function makeDashboard(rows: DashboardRow[]): DashboardResponse {
  return {
    rows,
    n_symbols: rows.length,
    n_available: rows.filter((r) => r.available).length,
    oldest_measurement: null,
    newest_measurement: null,
  };
}

const NO_FEED: Partial<DashboardRow> = {
  available: false, price: null, change: null, change_pct: null, score: null,
  signal: null, sparkline: [], risk_band: null, risk_band_label: null,
};

export const DASHBOARD = makeDashboard([
  makeDashboardRow("COMI", {
    score: 72, signal: "Strong", price: 82.5, change: 1.2, change_pct: 1.48,
    sigma_63_ann_pct: 22, risk_band: "calm", risk_band_label: "Calm",
    dividend_yield: 3.2, dividend_ex_date_recent: "2026-04-07",
  }),
  makeDashboardRow("TMGH", {
    score: 41, signal: "Neutral", price: 60.1, change: -0.9, change_pct: -1.47,
    sigma_63_ann_pct: 48, risk_band: "jumpy", risk_band_label: "Jumpy",
  }),
  makeDashboardRow("ETEL", {
    score: 63, signal: "Strong", price: 38, change: 0.2, change_pct: 0.53,
    sigma_63_ann_pct: 30, dividend_yield: 5.1, dividend_ex_date_recent: "2026-05-20",
  }),
  makeDashboardRow("ABUK", {
    score: null, signal: null, price: 55, change: 0, change_pct: 0,
    sigma_63_ann_pct: null, risk_band: null, risk_band_label: null, dividend_yield: null,
  }),
  makeDashboardRow("MEGM", NO_FEED),
  makeDashboardRow("ACGC", NO_FEED),
]);

export function batch(
  scores: CompositeBatchResponse["scores"],
  errors: CompositeBatchResponse["errors"] = []
): CompositeBatchResponse {
  return { scores, errors };
}

export const REGIME: MarketRegime = {
  mean_score: 52.3,
  n_symbols: 61,
  band: "mixed",
  label: "Mixed",
  summary: "About half the market is in good technical shape.",
  horizon_days: 63,
  hist_median_3m_pct: 2.1,
  hist_positive_rate: 0.58,
  observations: 140,
  association_rho: 0.12,
  association_t: 1.1,
  association_n: 140,
  association_significant: false,
  universe_size: 79,
  breadth: {
    n_symbols: 70,
    enough_data: true,
    pct_above_sma200: 62,
    pct_oversold: 9,
    mean_rsi: 51,
    evidence: {
      horizon_days: 63,
      strongest_leg: "pct_oversold",
      strongest_rho: -0.19,
      strongest_t: -2.44,
      significant_at_project_bar: false,
      note: "",
    },
  },
};

const cat = (score: number | null, reasons: string[] = []): CategoryScore => ({
  score,
  weight: 12.5,
  effective_weight: score === null ? 0 : 14.3,
  weighted_contribution: 0,
  reasons,
});

const noDivergence = (): DivergenceInfo => ({
  bullish: false, bearish: false, hidden_bullish: false, hidden_bearish: false, detail: null,
});

export const KEY_LEVELS: KeyLevels = {
  current_price: 82.5,
  nearest_support: { price: 80, distance_pct: -3.03, strength: 3, bars_ago: 4 },
  nearest_resistance: { price: 85, distance_pct: 3.03, strength: 1, bars_ago: 63 },
  room_to_support_pct: 3.03,
  room_to_resistance_pct: 3.03,
  clear_air_above: false,
};

export const ENTRY_EXIT: EntryExit = {
  entry_zone: {
    active: true,
    confidence: "high",
    price_range: { low: 80, high: 81.5 },
    suggested_stop_loss: 77.3,
    reasons: ["Tested support at 80.00 (3 touches)", "RSI 48 — not overbought"],
  },
  exit_zone: { active: false, confidence: null, price_range: null, reasons: [] },
};

const CAL: ForecastCalibration = {
  fitted_at: "2026-09-01", n_observations: 48210, universe: "EGX", sigma_window: 63, fit_horizon_days: 21,
};

export const FORECAST: StockForecast = {
  expected_move: {
    daily_pct: 1.8, weekly_pct: 4.1, monthly_pct: 8.3,
    daily_coverage_pct: 79, weekly_coverage_pct: 76.2, monthly_coverage_pct: 72.9,
    method: "egx_sigma", calibration: CAL,
  },
  outcome_band: {
    days: 2,
    current_price: 100,
    method: "egx_quantiles",
    calibration: CAL,
    bands: [
      { coverage_pct: 50, z: 0.67, lo: [95, 90], hi: [105, 110], outside_pct: 50 },
      { coverage_pct: 90, z: 1.64, lo: [90, 80], hi: [110, 120], outside_pct: 10 },
    ],
    endpoint: { coverage_pct: 90, lo: 80, hi: 120 },
  },
};

export function makeAnalysis(o: Partial<AnalysisResponse> = {}): AnalysisResponse {
  const nulls = [null, null, null];
  return {
    symbol: "COMI",
    interval: "Daily",
    bars: 200,
    ohlcv: {
      dates: ["2026-09-01", "2026-09-02", "2026-09-03"],
      open: [80, 81, 82],
      high: [81, 82, 83.5],
      low: [79, 80, 81],
      close: [81, 81.3, 82.5],
      volume: [1_000_000, 1_200_000, 1_500_000],
    },
    indicators: {
      sma_20: [null, 81, 82], sma_50: nulls, sma_200: nulls, ema_12: [80, 81, 82], ema_26: nulls,
      rsi: [null, 55, 62.4], macd_line: [0.1, 0.2, 0.3], macd_signal: [0.1, 0.1, 0.2],
      macd_histogram: [0, 0.1, 0.1], bollinger_upper: [85, 86, 87], bollinger_middle: [80, 81, 82],
      bollinger_lower: [75, 76, 77], daily_returns: [null, 0.01, 0.02], volatility: [null, 0.018, 0.021],
      cumulative_returns: [0, 0.01, 0.031], atr: [null, 1.8, 2.06], obv: [100, 200, 300],
      stochastic_k: [50, 60, 70], stochastic_d: [50, 55, 60], adx: nulls, plus_di: nulls,
      minus_di: nulls, mfi: nulls,
    },
    stats: {
      current_price: 82.5, previous_close: 81.3, change: 1.2, change_pct: 1.48,
      high_52w: 90, low_52w: 60, avg_volume: 1_250_000,
    },
    beta: 1.12,
    support_resistance: {
      supports: [{ price: 80, strength: 3 }, { price: 78, strength: 2 }, { price: 75, strength: 1 }, { price: 70, strength: 1 }],
      resistances: [{ price: 85, strength: 2 }],
    },
    fibonacci: { high: 90, low: 60, levels: { "0.382": 78.5, "0.5": 75, "0.618": 71.5 } },
    crossovers: { golden_cross: "2026-08-20", death_cross: null, current_signal: "golden_cross", days_since_cross: 12 },
    composite_score: {
      score: 72,
      signal: "Strong",
      categories: {
        trend: cat(80, ["Price above SMA 50", "ADX 28 — trending"]),
        momentum: cat(65),
        volume: cat(55),
        volatility: cat(60),
        divergence: cat(null),
        quality: cat(70),
        risk_adjusted: cat(50),
        relative_strength: cat(75),
      },
      weights: {},
      macro_adjustment: null,
      macro_context: null,
    },
    divergences: { rsi: noDivergence(), macd: noDivergence() },
    volume_price: { classification: "normal", price_change_pct: 1.48, volume_ratio: 1.1 },
    multi_timeframe: { daily_trend: "up", weekly_trend: "up", aligned: true, alignment_score: 1 },
    bb_squeeze: false,
    key_levels: KEY_LEVELS,
    entry_exit: ENTRY_EXIT,
    trendlines: {
      support: { values: [null, 80.5, 81], anchors: [], direction: "up", slope_pct_per_bar: 0.3 },
      resistance: null,
    },
    pe: {
      company_name: "Commercial International Bank", pe_ratio: 9.14, dividend_yield: 3.2,
      loss_making: false, fetched_at: "2026-09-01T03:00:00Z",
    },
    forecast: FORECAST,
    ...o,
  };
}

export const RISK: RiskResponse = {
  data: [
    {
      symbol: "COMI",
      measured_at: "2026-09-02T21:00:00Z",
      sigma_63_ann_pct: 24.4,
      sigma_ewma_ann_pct: 23,
      beta: 1.05,
      turnover_egp: 120_000_000,
      traded_share: 1,
      last_price: 82.5,
      tradeable: true,
      pct_rank: 18.2,
      quintile: 1,
      band: "calm",
      band_label: "Calm",
      historical: { future_vol_ann_pct: 24.3, median_max_drawdown_pct: 11.6, p90_max_drawdown_pct: 21.2 },
    },
  ],
  n_symbols: 160,
  n_ranked: 140,
  oldest_measurement: "2026-09-02T21:00:00Z",
  calibration: {
    fitted_at: "2026-09-01", n_observations: 9120, n_symbols: 140, lookback_days: 63,
    forward_days: 126, vol_predicts_vol_ic: 0.56, vol_predicts_drawdown_ic: 0.43,
  },
};

export const DIVIDEND_HISTORY: DividendHistoryResponse = {
  symbol: "COMI",
  dividends: Array.from({ length: 12 }, (_, i) => ({
    ex_date: `${2026 - i}-04-07`,
    amount: 6 - i * 0.25,
    year: 2026 - i,
  })),
  cadence: { last_ex_date: "2026-04-07", typical_month: 4, typical_month_name: "April", payments_per_year: 1, count: 12 },
  status: "ok",
};

export const COMPARE: CompareResponse = {
  symbols: ["COMI", "TMGH"],
  dates: ["2026-04-12", "2026-10-08"],
  COMI: [100, 112.34],
  TMGH: [100, 95],
  stats: {
    COMI: { total_return: 12.34, volatility: 0.025, max_drawdown: -8.2 },
    TMGH: { total_return: -5, volatility: 0.031, max_drawdown: -14.1 },
  },
};

const HOUR = 3_600_000;
const hoursAgoIso = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

export const NEWS: NewsResponse = {
  your_stocks: [
    { id: "n1", title: "CIB posts record quarterly profit", provider: "reuters", published_at: hoursAgoIso(2), url: "https://www.tradingview.com/news/n1", symbols: ["COMI"] },
    { id: "n2", title: "Sodic signs facility with CIB", provider: "zawya", published_at: hoursAgoIso(72), url: "https://www.tradingview.com/news/n2", symbols: ["OCDI", "COMI"] },
  ],
  market: [
    { id: "m1", title: "EGX30 closes higher", provider: "lse", published_at: hoursAgoIso(30), url: "https://www.tradingview.com/news/m1", symbols: [] },
  ],
  coverage: {
    symbols_requested: 5,
    symbols_with_news: 3,
    symbols_without_news: ["ESRS", "EKHO"],
    symbols_over_cap: [],
    window_days: 30,
  },
  fetched_at: new Date().toISOString(),
  status: "partial",
};

export const CALENDAR: DividendCalendarResponse = {
  stocks: [
    { symbol: "COMI", name: "Commercial International Bank", dividend_yield: 3.2, ex_date: "2026-04-07", amount: 6 },
    { symbol: "ETEL", name: "Telecom Egypt", dividend_yield: 5.1, ex_date: "2026-04-07", amount: 1.5 },
    { symbol: "SWDY", name: null, dividend_yield: null, ex_date: "2026-04-20", amount: 0.9 },
    { symbol: "ABUK", name: "ABUK", dividend_yield: 8.5, ex_date: "2025-05-11", amount: 12 },
  ],
  count: 4,
  as_of: "2026-10-09",
  status: "ok",
};
