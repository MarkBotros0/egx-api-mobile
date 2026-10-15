import { View } from "react-native";
import { useMarket } from "@/providers/market";
import { CURRENT_DD_NEUTRAL, T_BILL_RATE_PCT } from "@/shared/constants";
import type { Market } from "@/shared/markets";
import type { PortfolioMetrics } from "@/shared/types";
import { AppText, Card, LearnTerm } from "@/ui";
import { currentDrawdownTone, drawdownTone, sharpeTone, sortinoTone } from "./logic/display";

function RiskMetric({
  label, value, tone = "text-white", suffix, suffixClass = "text-white/30", term, explanation,
}: {
  label: string; value: string; tone?: string; suffix?: string; suffixClass?: string; term: string; explanation: string;
}) {
  return (
    <View className="mb-4 w-1/2 pr-2">
      <LearnTerm term={term} explanation={explanation}>
        <AppText className="font-sans text-xs text-white/40">{label}</AppText>
      </LearnTerm>
      <AppText className={`font-mono-semibold text-lg ${tone}`}>{value}</AppText>
      {suffix ? <AppText className={`font-sans text-[10px] ${suffixClass}`}>{suffix}</AppText> : null}
    </View>
  );
}

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * Where the risk-free hurdle comes from. EG: Egyptian cash at the shared
 * constant. Elsewhere: the market's 3-month T-bill at the server's rate, which
 * the sales response carries (null until it lands, so no number is guessed).
 */
export function sharpeExplanation(market: Market, riskFreeRatePct: number | null): string {
  const cash =
    market.code === "EG"
      ? `risk-free Egyptian cash (~${T_BILL_RATE_PCT}%)`
      : `the ${market.short_name} 3-month T-bill${riskFreeRatePct != null ? ` (~${riskFreeRatePct.toFixed(1)}%)` : ""}`;
  return `Measures risk-adjusted return. Higher = better. A ratio > 1 means your returns strongly justify the risk. Below 0 means you would earn more in ${cash}.`;
}

export function RiskDashboard({
  metrics,
  currency,
  riskFreeRatePct = null,
}: {
  metrics: PortfolioMetrics;
  currency: string;
  /** The server's risk-free rate for this market; used outside EG. */
  riskFreeRatePct?: number | null;
}) {
  const { market } = useMarket();
  const dd = metrics.max_drawdown?.value;
  const currentDd = metrics.max_drawdown?.current_drawdown;

  return (
    <Card>
      <AppText variant="title" className="mb-4 font-sans-semibold text-lg text-white">
        Risk Dashboard
      </AppText>
      <View className="flex-row flex-wrap">
        <RiskMetric
          label="Sharpe Ratio"
          value={metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : "--"}
          tone={sharpeTone(metrics.sharpe_ratio)}
          term="Sharpe Ratio"
          explanation={sharpeExplanation(market, riskFreeRatePct)}
        />
        <RiskMetric
          label="Sortino Ratio"
          value={metrics.sortino_ratio != null ? metrics.sortino_ratio.toFixed(2) : "--"}
          tone={sortinoTone(metrics.sortino_ratio)}
          term="Sortino Ratio"
          explanation="Like Sharpe but only counts downside risk, ignoring good volatility. A fairer measure if your stocks have had big upside swings."
        />
        <RiskMetric
          label="Max Drawdown"
          value={dd != null ? pct1(dd) : "--"}
          tone={drawdownTone(dd)}
          suffix={metrics.max_drawdown?.trough_date ? `on ${metrics.max_drawdown.trough_date}` : undefined}
          term="Max Drawdown"
          explanation="The largest peak-to-trough decline this mix of holdings would have gone through over the analysis window — at your current weights, including dates before you owned them. It measures how bumpy the mix is, not what your account actually did. Ask yourself: could I stomach this emotionally?"
        />
        {/* The money figure is a magnitude and the backend's pct a negative return;
            abs() keeps both halves of the tile saying the same loss. */}
        <RiskMetric
          label="Daily VaR (95%)"
          value={metrics.var_95_egp != null ? `${metrics.var_95_egp.toLocaleString("en-US")} ${currency}` : "--"}
          suffix={metrics.var_95_pct != null ? `${Math.abs(metrics.var_95_pct * 100).toFixed(1)}% of portfolio` : undefined}
          term="Value at Risk (VaR)"
          explanation="On 95% of days, your portfolio won't lose more than this amount. On the worst 5% of days, losses could exceed this. Make sure you're comfortable with this number."
        />
        <RiskMetric
          label="Current Drawdown"
          value={currentDd != null ? pct1(currentDd) : "--"}
          tone={currentDrawdownTone(currentDd)}
          suffix={currentDd != null && currentDd < CURRENT_DD_NEUTRAL ? "Below peak" : undefined}
          suffixClass="text-yellow-400/60"
          term="Current Drawdown"
          explanation="How far your portfolio is currently below its recent peak value. If 0%, you're at or near all-time highs. A negative value means you're in a drawdown."
        />
      </View>
      {/* An EG fact: other markets' rates are not unusually high. */}
      {market.code === "EG" && (
        <AppText className="font-sans text-[10px] text-white/30">
          Note: Egypt&apos;s risk-free rate is ~{T_BILL_RATE_PCT}%, which is very high globally. This makes it harder for
          stocks to have a positive Sharpe ratio compared to other markets.
        </AppText>
      )}
    </Card>
  );
}
