import type { ReactNode } from "react";
import { View } from "react-native";
import { AllocationBar, CompositeGauge, scoreColor } from "@/charts";
import type { PortfolioMetrics } from "@/shared/types";
import { PreliminaryTag } from "@/features/market/PreliminaryTag";
import { AppText, Card, LearnTerm } from "@/ui";
import { diversificationTone, excludedNotice } from "./logic/display";
import { egp2, pnlTone, signedPct } from "./logic/format";

const DIVERSIFICATION_HELP =
  "A 0-100 score measuring how well-spread your investments are across different stocks and sectors. Higher = better diversified = lower risk. The score starts dropping at the same points that trigger a concentration warning: any single stock above 35%, or any sector above 40%, of your portfolio.";
const AVG_SCORE_HELP =
  "Value-weighted average composite score across your holdings, so bigger positions count for more. 0-100, blending 8 categories: trend, momentum, volume, volatility, divergence, quality, risk-adjusted return and relative strength. It summarises the current technical condition of what you hold — it is not a forecast of how the portfolio will perform.";

function Tile({ label, term, help, children }: { label: string; term?: string; help?: string; children: ReactNode }) {
  const caption = <AppText className="font-sans text-xs text-white/40">{label}</AppText>;
  return (
    <View className="mb-4 w-1/2 pr-2">
      {help ? (
        <LearnTerm term={term ?? label} explanation={help}>
          {caption}
        </LearnTerm>
      ) : (
        caption
      )}
      {children}
    </View>
  );
}

export function PortfolioSummary({ metrics, currency }: { metrics: PortfolioMetrics; currency: string }) {
  const tone = pnlTone(metrics.total_pnl);
  const sign = metrics.total_pnl >= 0 ? "+" : "";
  const sectors = Object.entries(metrics.sector_allocation).map(([name, value]) => ({ name, value }));
  const notice = excludedNotice(metrics, currency);

  return (
    <Card>
      <AppText variant="title" className="mb-4 font-sans-semibold text-lg text-white">
        Portfolio Summary
      </AppText>

      {notice && (
        <View className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <AppText className="font-sans text-xs text-amber-400">{notice}</AppText>
        </View>
      )}

      <View className="flex-row flex-wrap">
        <Tile label="Total Value">
          <AppText className="font-mono-semibold text-xl text-white">{egp2(metrics.total_value)}</AppText>
          <AppText className="font-sans text-xs text-white/30">{currency}</AppText>
        </Tile>
        <Tile label="Total P&L">
          <AppText className={`font-mono-semibold text-xl ${tone}`}>
            {sign}
            {egp2(metrics.total_pnl)}
          </AppText>
          <AppText className={`font-mono text-xs ${tone}`}>{signedPct(metrics.total_pnl_pct, 2)}</AppText>
        </Tile>
        <Tile label="Diversification" term="Diversification Score" help={DIVERSIFICATION_HELP}>
          <AppText className={`font-mono-semibold text-xl ${diversificationTone(metrics.diversification_score)}`}>
            {metrics.diversification_score.toFixed(0)}
          </AppText>
          <AppText className="font-sans text-xs text-white/30">/100</AppText>
        </Tile>
        {metrics.avg_composite_score != null && (
          <Tile label="Avg Score" term="Avg Composite Score" help={AVG_SCORE_HELP}>
            <View className="mt-1 flex-row items-center gap-2">
              <CompositeGauge score={metrics.avg_composite_score} signal={null} size="sm" />
              <AppText
                className="font-mono-semibold text-xl"
                style={{ color: scoreColor(metrics.avg_composite_score) }}
              >
                {metrics.avg_composite_score.toFixed(0)}
              </AppText>
              <PreliminaryTag compact />
            </View>
            <AppText className="font-sans text-xs text-white/30">/100</AppText>
          </Tile>
        )}
      </View>

      {sectors.length > 0 && (
        <View className="mt-2">
          <AppText className="mb-3 font-sans text-xs text-white/40">Sector Allocation</AppText>
          <AllocationBar allocation={metrics.sector_allocation} />
        </View>
      )}
    </Card>
  );
}
