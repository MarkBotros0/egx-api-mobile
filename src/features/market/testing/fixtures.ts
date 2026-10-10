import type { CompositeBatchResponse, DashboardResponse, DashboardRow } from "@/shared/api";
import type { Ticker } from "@/shared/types";

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
