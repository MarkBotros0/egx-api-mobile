import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { conceptKey, normalizeSearch, searchConcepts } from "@/shared/learn";
import { T_BILL_RATE_PCT } from "@/shared/constants";
import { walk } from "@/shared/learnVisuals";

/** The nine old section anchors, in teaching order. Bookmarks depend on them. */
const MODULE_IDS = [
  "market-basics",
  "egx",
  "technical-analysis",
  "advanced-technical-indicators",
  "composite-score",
  "decision-framework",
  "risk-management",
  "portfolio-risk-metrics",
  "macro-context",
];

/** learn_concept ids the BACKEND emits (egx-api-be/app/routers/portfolio_analysis.py). */
const BACKEND_IDS = [
  "adx", "atr", "beta", "composite_score", "correlation", "divergence",
  "dividend_yield", "egx30_benchmark", "entry_exit_zones", "golden_death_cross",
  "liquidity", "max_drawdown", "mfi", "obv", "pe_ratio", "relative_strength",
  "risk_adjusted_return", "rsi", "sharpe_ratio", "sma", "stochastic",
  "stop_loss", "support_resistance",
];

/** Fixed links in the app (MarketRegimeCard, RiskGradeCard, DividendHistoryCard, ForecastCard, EntryExitCard, PriceChart, Calibration). */
const FIXED_LINKS = [
  "market_condition", "risk-management", "dividend_dates", "expected_move",
  "entry_exit_zones", "trendlines",
];

/** Every concept id that existed on 2026-10-10. Never shrink this list. */
const KNOWN_CONCEPT_IDS = [
  "sma", "trendlines", "rsi", "support_resistance", "entry_exit_zones",
  "golden_death_cross", "beta", "atr", "obv", "multi_timeframe", "which_interval",
  "stochastic", "adx", "mfi", "divergence", "composite_score", "score_limits",
  "market_condition", "risk_adjusted_return", "relative_strength", "quality",
  "decision_step_macro", "decision_step_score", "decision_step_risk",
  "decision_step_leader", "decision_step_stop", "decision_step_size",
  "why_no_price_prediction", "stop_loss", "liquidity", "cash_underperformer",
  "max_buy_price", "realized_gains", "dividends", "dividend_dates",
  "expected_move", "sharpe_ratio", "correlation", "max_drawdown",
  "egx30_benchmark", "pe_ratio", "dividend_yield",
];

const allIds = new Set<string>([
  ...CURRICULUM.map((m) => m.id),
  ...ALL_CONCEPTS.map(({ concept }) => conceptKey(concept)),
]);

describe("shared Learn curriculum", () => {
  it("keeps the nine module anchors, in teaching order", () => {
    expect(CURRICULUM.map((m) => m.id)).toEqual(MODULE_IDS);
  });

  it.each([...BACKEND_IDS, ...FIXED_LINKS, ...KNOWN_CONCEPT_IDS])(
    "still has the anchor %s",
    (id) => {
      expect(allIds.has(id)).toBe(true);
    }
  );

  it("gives every concept a unique key", () => {
    const keys = ALL_CONCEPTS.map(({ concept }) => conceptKey(concept));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps module ids hyphenated and concept ids underscored, so they cannot collide", () => {
    for (const m of CURRICULUM) expect(m.id).not.toContain("_");
    for (const { concept } of ALL_CONCEPTS) if (concept.id) expect(concept.id).not.toContain("-");
  });

  it("derives the concept count from the data", () => {
    expect(TOTAL_CONCEPTS).toBe(CURRICULUM.reduce((n, m) => n + m.concepts.length, 0));
  });

  it("interpolates the T-bill rate rather than restating it", () => {
    const text = JSON.stringify(CURRICULUM);
    const stated = [...text.matchAll(/T-bills? (?:near|at|paid|offer|offers) (\d+(?:\.\d+)?)%/g)].map(
      (m) => Number(m[1])
    );
    expect(stated.length).toBeGreaterThanOrEqual(3);
    for (const n of stated) expect(n).toBe(T_BILL_RATE_PCT);
  });
});

describe("Learn search", () => {
  it("folds punctuation on both sides", () => {
    expect(normalizeSearch("Stop-Loss")).toBe("stop loss");
    expect(normalizeSearch("  P/E  ")).toBe("p e");
  });

  it.each(["stop loss", "t bill", "p e", "risk adjusted"])("finds concepts for %s", (q) => {
    expect(searchConcepts(ALL_CONCEPTS, q)?.length ?? 0).toBeGreaterThan(0);
  });

  it("matches the hyphenated and spaced spellings identically", () => {
    expect(searchConcepts(ALL_CONCEPTS, "stop loss")?.length).toBe(
      searchConcepts(ALL_CONCEPTS, "stop-loss")?.length
    );
  });

  it("returns null for an empty or punctuation-only query", () => {
    expect(searchConcepts(ALL_CONCEPTS, "   ")).toBeNull();
    expect(searchConcepts(ALL_CONCEPTS, "--/")).toBeNull();
  });
});

describe("illustrative series", () => {
  it("are seeded: the same seed gives the same walk", () => {
    expect(walk(30, 7, { start: 62, drift: 0.42, vol: 1.1 })).toEqual(
      walk(30, 7, { start: 62, drift: 0.42, vol: 1.1 })
    );
  });
});
