import { View } from "react-native";
import { T_BILL_RATE_PCT } from "@/shared/constants";
import type { Market } from "@/shared/markets";
import { formatPrice } from "@/shared/money";
import type { AnalysisStats, CrossoverInfo, PEData } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { changeText, formatPE, formatVolume } from "./logic/format";
import { betaClass, dividendYieldClass, peClass, rsiClass, signedClass } from "./logic/statTones";

export interface StatsPanelProps {
  stats: AnalysisStats;
  latestRsi?: number | null;
  latestVolatility?: number | null;
  cumulativeReturn?: number | null;
  beta?: number | null;
  atr?: number | null;
  atrPct?: number | null;
  crossovers?: CrossoverInfo | null;
  pe?: PEData | null;
  /** The market's currency code, from the analysis response. */
  currency: string;
  /** The market this stock trades on: names the benchmark and the currency in the explanations. */
  market: Market;
}

/** The tooltip copy that names a market. EG medians and the EG policy rate are EG facts, so they are EG-only. */
export function statExplanations(market: Market) {
  const eg = market.code === "EG";
  const cur = market.currency;
  const bench = market.benchmark_label;
  return {
    betaTerm: `Beta vs ${bench}`,
    beta: `Measures how much this stock moves relative to the ${bench} index. Beta > 1 = more volatile than market. Beta < 1 = less volatile. Beta = 1 = moves with the market. A negative beta means it tends to move in the OPPOSITE direction to the index — its size still tells you how big those moves are.`,
    pe: `Price-to-Earnings: how many ${cur} investors pay for every 1 ${cur} of annual profit.${eg ? " Judge it against the EGX median of about 12, not against global markets — under 8 is genuinely cheap here, over 25 is expensive." : ""} Below 3 is a warning, not a bargain: it usually means one-off earnings or a collapsed share price.`,
    dividendYield: eg
      ? `Annual dividends as a percentage of the current share price. The EGX median is about 3%. Read a healthy yield as evidence the company generates real cash, not as income — even 8% loses to the ~${T_BILL_RATE_PCT}% policy rate. Above 15% is a red flag: usually a one-off special dividend or a share price that has collapsed.`
      : "Annual dividends as a percentage of the current share price. Read a healthy yield as evidence the company generates real cash. Above 15% is a red flag: usually a one-off special dividend or a share price that has collapsed.",
  };
}

function StatRow({
  label,
  value,
  tooltip,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  tooltip?: { term: string; explanation: string };
  valueClass?: string;
}) {
  return (
    <View className="min-h-[36px] flex-row items-center justify-between gap-3 border-b border-white/5 py-2">
      {tooltip ? (
        <LearnTerm term={tooltip.term} explanation={tooltip.explanation} className="text-xs text-white/50">
          {label}
        </LearnTerm>
      ) : (
        <AppText className="text-xs text-white/50">{label}</AppText>
      )}
      <AppText className={`font-mono text-xs ${valueClass}`}>{value}</AppText>
    </View>
  );
}

/** Port of web `StatsPanel` — Key Statistics, first on the phone. */
export function StatsPanel({
  stats,
  latestRsi,
  latestVolatility,
  cumulativeReturn,
  beta,
  atr,
  atrPct,
  crossovers,
  pe,
  currency,
  market,
}: StatsPanelProps) {
  const copy = statExplanations(market);
  const golden = crossovers?.current_signal === "golden_cross";
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <AppText className="mb-3 font-sans-medium text-sm text-white/70">Key Statistics</AppText>

      {crossovers?.current_signal && (
        <View className={`mb-3 rounded-lg border px-3 py-2 ${golden ? "border-gain/20 bg-gain/10" : "border-loss/20 bg-loss/10"}`}>
          <AppText className={`text-center font-sans-semibold text-xs ${golden ? "text-gain" : "text-loss"}`}>
            {`${golden ? "Golden Cross Active" : "Death Cross Active"}${crossovers.days_since_cross != null ? ` (${crossovers.days_since_cross}d ago)` : ""}`}
          </AppText>
        </View>
      )}

      <StatRow label="Current Price" value={formatPrice(stats.current_price, currency)} />
      <StatRow label="Change" value={changeText(stats.change, stats.change_pct)} valueClass={signedClass(stats.change_pct)} />
      <StatRow
        label="52W High"
        value={stats.high_52w.toFixed(2)}
        tooltip={{ term: "52-Week High", explanation: "The highest price reached in the last 252 trading days (~1 year), including intraday highs. This window is fixed — changing the chart's bar count doesn't change it. Stocks near their 52-week high have strong momentum but may face resistance." }}
      />
      <StatRow
        label="52W Low"
        value={stats.low_52w.toFixed(2)}
        tooltip={{ term: "52-Week Low", explanation: "The lowest price reached in the last year, including intraday lows. Stocks near their 52-week low may be undervalued or may have fundamental problems — investigate before buying." }}
      />
      <StatRow
        label="Avg Volume (20d)"
        value={formatVolume(stats.avg_volume)}
        tooltip={{ term: "Average Volume", explanation: "The average number of shares traded per day over the last 20 days. Higher volume = more liquid (easier to buy/sell). Low volume stocks can be hard to exit quickly." }}
      />
      {latestRsi != null && (
        <StatRow
          label="RSI (14)"
          value={latestRsi.toFixed(1)}
          valueClass={rsiClass(latestRsi)}
          tooltip={{ term: "RSI", explanation: "Relative Strength Index. 0-100 scale. >70 = overbought, <30 = oversold. Helps gauge if a stock has moved too far too fast." }}
        />
      )}
      {latestVolatility != null && (
        <StatRow
          label="Volatility (20d daily)"
          value={`${(latestVolatility * 100).toFixed(2)}%`}
          tooltip={{ term: "Volatility (daily)", explanation: "A typical ONE-DAY move, measured as the standard deviation of daily returns over the last 20 days. The Risk-Adjusted category in the score breakdown quotes an ANNUALIZED figure instead — roughly this number times 16 — so the two look very different for the same stock. High volatility = more risk but also more potential reward." }}
        />
      )}
      {cumulativeReturn != null && (
        <StatRow
          label="Cumulative Return"
          value={`${(cumulativeReturn * 100).toFixed(2)}%`}
          valueClass={signedClass(cumulativeReturn)}
          tooltip={{ term: "Cumulative Return", explanation: "Total return since the first data point in the chart. Shows how much you would have gained or lost if you held from the beginning." }}
        />
      )}
      {beta != null && (
        <StatRow
          label="Beta"
          value={beta.toFixed(2)}
          valueClass={betaClass(beta)}
          tooltip={{ term: copy.betaTerm, explanation: copy.beta }}
        />
      )}
      {atr != null && (
        <StatRow
          label="ATR (14)"
          value={`${atr.toFixed(2)}${atrPct != null ? ` (${atrPct}%)` : ""}`}
          tooltip={{ term: "ATR — Average True Range", explanation: "Measures average daily price movement. Use it to set stop-losses: this app places them 1.5x ATR below the nearest support level, far enough that normal daily noise won't stop you out. The Entry Zone card shows the exact figure." }}
        />
      )}
      {pe?.loss_making && (
        <StatRow
          label="Earnings"
          value="Loss-making"
          valueClass="text-loss"
          tooltip={{ term: "Loss-making", explanation: "The company reported negative earnings over the last twelve months, so there is no meaningful P/E to quote. Valuation has to lean on trend and relative strength instead." }}
        />
      )}
      {pe && pe.pe_ratio != null && (
        <StatRow
          label="P/E Ratio"
          value={formatPE(pe)}
          valueClass={peClass(pe.pe_ratio)}
          tooltip={{ term: "P/E Ratio", explanation: copy.pe }}
        />
      )}
      {pe && pe.dividend_yield != null && pe.dividend_yield > 0 && (
        <StatRow
          label="Dividend Yield"
          value={`${pe.dividend_yield.toFixed(2)}%`}
          valueClass={dividendYieldClass(pe.dividend_yield)}
          tooltip={{ term: "Dividend Yield", explanation: copy.dividendYield }}
        />
      )}
    </View>
  );
}
