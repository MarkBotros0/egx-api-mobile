/**
 * Typed fixtures for the portfolio feature. The two-lot COMI position is the
 * guide's own worked example: 200 at 41.00 (Jan) + 100 at 45.20 (Jun) =
 * 300 at a cost-weighted 42.40; selling 250 at 52.00 realizes 2,540 EGP over
 * the parts, not the 2,400 the average would give.
 */
import type {
  Dividend,
  HoldingAnalysis,
  MacroData,
  Portfolio,
  PortfolioAnalysisResponse,
  PortfolioHolding,
  PortfolioMetrics,
  Sale,
  SaleOrder,
  SalesResponse,
  SalesSummary,
  Signal,
  Ticker,
} from "@/shared/types";

export const TICKERS: Ticker[] = [
  { symbol: "COMI", name: "Commercial International Bank", sector: "Banking", index: "EGX30" },
  { symbol: "ETEL", name: "Telecom Egypt", sector: "Telecom", index: "EGX30" },
  { symbol: "SWDY", name: "Elsewedy Electric", sector: "Industrial", index: "EGX30" },
];

export const LOT_A: PortfolioHolding = {
  id: "lotA",
  symbol: "COMI",
  name: "Commercial International Bank",
  buy_price: 41,
  buy_date: "2026-01-10",
  quantity: 200,
  notes: "",
  sector: "Banking",
  target_price: null,
  stop_loss: null,
  created_at: "2026-01-10T10:00:00Z",
  updated_at: "2026-01-10T10:00:00Z",
};

export const LOT_B: PortfolioHolding = {
  ...LOT_A,
  id: "lotB",
  buy_price: 45.2,
  buy_date: "2026-06-01",
  quantity: 100,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

export const TWO_LOT_ROWS: PortfolioHolding[] = [LOT_A, LOT_B];

export function portfolio(rows: PortfolioHolding[] = TWO_LOT_ROWS): Portfolio {
  return { portfolio: rows, currency: "EGP" };
}

export function holding(overrides: Partial<HoldingAnalysis> = {}): HoldingAnalysis {
  return {
    id: "h1",
    symbol: "COMI",
    name: "Commercial International Bank",
    sector: "Banking",
    quantity: 100,
    buy_price: 41,
    buy_date: "2026-01-10",
    current_price: 52,
    current_value: 5200,
    invested: 4100,
    pnl: 1100,
    pnl_pct: 26.83,
    days_held: 273,
    annualized_return: 37.2,
    rsi: 55,
    sma_50: 50,
    above_sma: true,
    sma_200: 45,
    volatility: 0.021,
    volume_trend: "rising",
    target_price: null,
    stop_loss: null,
    dist_to_target: null,
    dist_to_stop: null,
    beta: 1.1,
    atr: 1.2,
    atr_pct: 2.3,
    obv_trend: "up",
    stochastic_k: 60,
    stochastic_d: 55,
    supports: [],
    resistances: [],
    fibonacci: { high: 55, low: 38, levels: {} },
    trend: "up",
    golden_cross_active: false,
    composite_score: 64,
    composite_signal: "Strong",
    entry_exit: null,
    key_levels: null,
    pe: null,
    dividends_collected: 0,
    dividends_symbol_shared: false,
    last_dividend_ex_date: null,
    last_dividend_amount: null,
    ...overrides,
  };
}

export function holdingFromRow(
  row: PortfolioHolding,
  currentPrice = 52,
  overrides: Partial<HoldingAnalysis> = {},
): HoldingAnalysis {
  const invested = row.buy_price * row.quantity;
  const value = currentPrice * row.quantity;
  return holding({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    quantity: row.quantity,
    buy_price: row.buy_price,
    buy_date: row.buy_date,
    current_price: currentPrice,
    current_value: value,
    invested,
    pnl: value - invested,
    pnl_pct: (value / invested - 1) * 100,
    ...overrides,
  });
}

export const TWO_LOT_HOLDINGS: HoldingAnalysis[] = [
  holdingFromRow(LOT_A, 52, { days_held: 273, annualized_return: 35.1 }),
  holdingFromRow(LOT_B, 52, { days_held: 131, annualized_return: 42.7 }),
];

export function metrics(overrides: Partial<PortfolioMetrics> = {}): PortfolioMetrics {
  return {
    total_value: 15600,
    total_invested: 12720,
    total_current_value: 15600,
    total_pnl: 2880,
    total_pnl_pct: 22.64,
    excluded_invested: 0,
    excluded_count: 0,
    sector_allocation: { Banking: 100 },
    stock_concentration: { COMI: 100 },
    diversification_score: 20,
    weighted_rsi: 55,
    num_holdings: 1,
    avg_composite_score: 64,
    sharpe_ratio: 0.42,
    sortino_ratio: 0.61,
    max_drawdown: { value: -0.18, peak_date: "2026-02-01", trough_date: "2026-03-15", current_drawdown: -0.03 },
    var_95_pct: -0.028,
    var_95_egp: 437,
    cvar_95_pct: -0.04,
    cvar_95_egp: 624,
    avg_correlation: null,
    ...overrides,
  };
}

export function macroData(overrides: Partial<MacroData> = {}): MacroData {
  return {
    egx30: { value: 31000, direction: "up", monthly_change_pct: 2.1 },
    usd_egp: { value: 48.5, direction: "down" },
    interest_rate: { value: 19, direction: "down" },
    currency_context: { egp_multiple: 8.25, usd_multiple: 0.94, years: 20, note: "" },
    ...overrides,
  };
}

export const SIGNALS: Signal[] = [
  {
    type: "stop_loss",
    severity: "action_required",
    symbol: "COMI",
    message: "COMI is close to its stop-loss",
    explanation: "Price is within 2% of the stop you set.",
    learn_concept: "stop_loss",
  },
  {
    type: "sector_concentration",
    severity: "warning",
    symbol: null,
    message: "Banking is 100% of your portfolio",
    explanation: "One sector carries all of your risk.",
    learn_concept: "diversification",
  },
  {
    type: "relative_strength_laggard",
    severity: "warning",
    symbol: "COMI",
    message: "COMI is lagging the EGX30",
    explanation: "Alpha below -10% over 30 days.",
    learn_concept: "relative_strength",
  },
  {
    type: "weak_composite",
    severity: "info",
    symbol: "COMI",
    message: "COMI reads Weak overall",
    explanation: "A condition reading, not a forecast.",
  },
];

export function analysisResponse(
  overrides: Partial<PortfolioAnalysisResponse> = {},
): PortfolioAnalysisResponse {
  return {
    holdings: TWO_LOT_HOLDINGS,
    excluded_holdings: [],
    portfolio_metrics: metrics(),
    correlation_matrix: null,
    monte_carlo: null,
    macro: macroData(),
    signals: SIGNALS,
    disclaimer: "Educational only.",
    ...overrides,
  };
}

export function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "s1",
    holding_id: "etel1",
    symbol: "ETEL",
    name: "Telecom Egypt",
    sector: "Telecom",
    quantity: 100,
    buy_price: 30,
    buy_date: "2025-03-01",
    sell_price: 36,
    sell_date: "2025-09-01",
    notes: "",
    created_at: "2025-09-01T10:00:00Z",
    cost: 3000,
    proceeds: 3600,
    realized_pnl: 600,
    realized_pnl_pct: 20,
    days_held: 184,
    annualized_return_pct: 43.6,
    beat_t_bill: true,
    sale_group_id: "o1",
    ...overrides,
  };
}

export function order(overrides: Partial<SaleOrder> = {}): SaleOrder {
  const s = sale();
  return {
    id: "o1",
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    sell_price: s.sell_price,
    sell_date: s.sell_date,
    notes: "",
    created_at: s.created_at,
    lots: [s],
    lots_count: 1,
    quantity: s.quantity,
    cost: s.cost,
    proceeds: s.proceeds,
    realized_pnl: s.realized_pnl,
    realized_pnl_pct: s.realized_pnl_pct,
    buy_date: s.buy_date,
    buy_date_latest: s.buy_date,
    days_held: s.days_held,
    annualized_return_pct: s.annualized_return_pct,
    beat_t_bill: s.beat_t_bill,
    t_bill_hurdle_pct: 21.4,
    ...overrides,
  };
}

const SWDY_A = sale({
  id: "sA", holding_id: "swA", symbol: "SWDY", name: "Elsewedy Electric", sector: "Industrial",
  quantity: 200, buy_price: 20, buy_date: "2025-01-05", sell_price: 25, sell_date: "2025-08-01",
  cost: 4000, proceeds: 5000, realized_pnl: 1000, realized_pnl_pct: 25, days_held: 208,
  annualized_return_pct: 47.9, beat_t_bill: true, sale_group_id: "o2",
});
const SWDY_B = sale({
  id: "sB", holding_id: "swB", symbol: "SWDY", name: "Elsewedy Electric", sector: "Industrial",
  quantity: 100, buy_price: 24, buy_date: "2025-05-10", sell_price: 25, sell_date: "2025-08-01",
  cost: 2400, proceeds: 2500, realized_pnl: 100, realized_pnl_pct: 4.17, days_held: 83,
  annualized_return_pct: 19.7, beat_t_bill: false, sale_group_id: "o2",
});

/** One submit that reached two purchases: one ledger line, undone as one. */
export const TWO_LOT_ORDER: SaleOrder = order({
  id: "o2", symbol: "SWDY", name: "Elsewedy Electric", sector: "Industrial",
  sell_price: 25, sell_date: "2025-08-01", lots: [SWDY_A, SWDY_B], lots_count: 2,
  quantity: 300, cost: 6400, proceeds: 7500, realized_pnl: 1100, realized_pnl_pct: 17.19,
  buy_date: "2025-01-05", buy_date_latest: "2025-05-10",
  days_held: null, annualized_return_pct: null, beat_t_bill: null, t_bill_hurdle_pct: null,
});

export function dividend(overrides: Partial<Dividend> = {}): Dividend {
  return {
    id: "d1",
    symbol: "COMI",
    name: "Commercial International Bank",
    sector: "Banking",
    amount: 1200,
    pay_date: "2026-04-07",
    shares: 300,
    notes: "",
    created_at: "2026-04-08T10:00:00Z",
    amount_per_share: 4,
    ...overrides,
  };
}

export function summary(overrides: Partial<SalesSummary> = {}): SalesSummary {
  const s = sale();
  return {
    total_realized_pnl: 600,
    total_realized_pnl_pct: 20,
    total_proceeds: 3600,
    total_cost: 3000,
    win_count: 1,
    loss_count: 0,
    beat_t_bill_count: 1,
    annualizable_count: 1,
    best_trade: s,
    worst_trade: s,
    by_symbol: [
      {
        symbol: "ETEL", name: "Telecom Egypt", sector: "Telecom", sales_count: 1, quantity: 100,
        cost: 3000, proceeds: 3600, realized_pnl: 600, realized_pnl_pct: 20, dividends: 0, total_winnings: 600,
      },
    ],
    total_dividends: 0,
    dividend_count: 0,
    total_winnings: 600,
    ...overrides,
  };
}

export function salesResponse(overrides: Partial<SalesResponse> = {}): SalesResponse {
  return {
    sales: [sale()],
    orders: [order()],
    summary: summary(),
    currency: "EGP",
    risk_free_rate_pct: 19,
    dividends: [],
    ...overrides,
  };
}

export const NO_SALES: SalesResponse = {
  sales: [],
  orders: [],
  summary: summary({
    total_realized_pnl: 0, total_realized_pnl_pct: null, total_proceeds: 0, total_cost: 0,
    win_count: 0, loss_count: 0, beat_t_bill_count: 0, annualizable_count: 0,
    best_trade: null, worst_trade: null, by_symbol: [], total_winnings: 0,
  }),
  currency: "EGP",
  risk_free_rate_pct: 19,
  dividends: [],
};
