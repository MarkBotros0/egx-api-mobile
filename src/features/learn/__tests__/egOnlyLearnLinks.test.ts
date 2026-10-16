import { ALL_CONCEPTS, CURRICULUM } from "@/shared/curriculum";
import { T_BILL_RATE_PCT } from "@/shared/constants";
import { EG_ONLY_LEARN_CONCEPTS, learnLinkFits } from "@/shared/learn";

/**
 * Learn content is Egyptian. A US screen must not link a US reader to a lesson
 * that teaches EGX numbers (no overlap where a concept does not fit both
 * markets). EG_ONLY_LEARN_CONCEPTS is a hand-kept list; this keeps it honest
 * against the curriculum text itself.
 */
const EG_FACT = new RegExp(`EGX|Egypt|EGP|CBE|COMI|NILEX|policy rate|MEGM|${T_BILL_RATE_PCT}%`);

// Every id the app links to: the backend's signal.learn_concept anchors
// (portfolio_analysis.py) plus the cards' fixed links.
const LINKED = [
  "adx", "atr", "beta", "composite_score", "correlation", "divergence", "dividend_yield",
  "entry_exit_zones", "golden_death_cross", "liquidity", "max_drawdown", "mfi", "obv",
  "pe_ratio", "relative_strength", "risk_adjusted_return", "rsi", "sharpe_ratio", "sma",
  "stochastic", "stop_loss", "support_resistance", "expected_move", "dividend_dates",
  "risk-management", "market_condition",
];

function text(id: string): string {
  const mod = CURRICULUM.find((m) => m.id === id);
  if (mod) return JSON.stringify(mod);
  const entry = ALL_CONCEPTS.find(({ concept }) => concept.id === id);
  if (!entry) throw new Error(`no Learn anchor ${id}`);
  return JSON.stringify(entry.concept);
}

it("every linked lesson that states an Egyptian fact is EG-only", () => {
  const leaking = LINKED.filter((id) => EG_FACT.test(text(id)) && !EG_ONLY_LEARN_CONCEPTS.has(id));
  expect(leaking).toEqual([]);
});

it("every EG-only entry still states an Egyptian fact (or the list is stale)", () => {
  const stale = [...EG_ONLY_LEARN_CONCEPTS].filter((id) => !EG_FACT.test(text(id)));
  expect(stale).toEqual([]);
});

it("links fit EG always, and another market only for market-neutral lessons", () => {
  expect(learnLinkFits("pe_ratio", "EG")).toBe(true);
  expect(learnLinkFits("pe_ratio", "US")).toBe(false);
  expect(learnLinkFits("rsi", "US")).toBe(true);
  expect(learnLinkFits(null, "EG")).toBe(false);
});
