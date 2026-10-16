import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref, routes } from "@/lib/links";
import type { StockForecast } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { OutcomeCone } from "./OutcomeCone";

/**
 * Ranges, not predictions (web ForecastCard). Never renders a price target or
 * colours a direction; coverage percentages come from the payload, never typed in.
 */
function MoveTile({ label, value, coverage }: { label: string; value: number; coverage: number }) {
  const inside = Math.round(coverage);
  return (
    <View className="flex-1 rounded-lg bg-white/[0.03] px-3 py-2">
      <AppText className="text-[10px] text-white/40">{label}</AppText>
      <AppText className="mt-0.5 font-mono-semibold text-sm text-white">{`±${value.toFixed(1)}%`}</AppText>
      <AppText className="mt-0.5 text-[9px] leading-tight text-white/30">{`${inside}% land inside`}</AppText>
      <AppText className="text-[9px] leading-tight text-white/30">{`${100 - inside}% are bigger`}</AppText>
    </View>
  );
}

export function ForecastCard({
  forecast,
  symbol,
  currency,
  adjective,
}: {
  forecast: StockForecast | null | undefined;
  symbol: string;
  currency: string;
  /** The stock's market, as copy ("Egyptian", "US"): MarketConfig.adjective. */
  adjective: string;
}) {
  if (!forecast || (!forecast.expected_move && !forecast.outcome_band)) return null;
  const { expected_move, outcome_band } = forecast;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm
            term="Outcome range"
            explanation={`How far this stock has typically travelled over a given stretch of time, fitted to the ${adjective} market's own history. It says nothing about direction — the range is deliberately centred on today's price.`}
          >
            Typical moves &amp; outcome range
          </LearnTerm>
          <AppText className="mt-0.5 text-[11px] text-white/40">Ranges, not predictions. No direction is implied.</AppText>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("expected_move"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn →</AppText>
        </Pressable>
      </View>

      {expected_move && (
        <View className="mb-4 flex-row gap-2">
          <MoveTile label="Typical day" value={expected_move.daily_pct} coverage={expected_move.daily_coverage_pct} />
          <MoveTile label="Typical week" value={expected_move.weekly_pct} coverage={expected_move.weekly_coverage_pct} />
          <MoveTile label="Typical month" value={expected_move.monthly_pct} coverage={expected_move.monthly_coverage_pct} />
        </View>
      )}

      {outcome_band && <OutcomeCone data={outcome_band} symbol={symbol} currency={currency} />}

      <AppText className="mt-3 text-[10px] leading-relaxed text-white/30">
        {`Fitted to how ${adjective} stocks have actually moved${outcome_band ? ` — ${outcome_band.calibration.n_observations.toLocaleString("en-US")} past checks, last fitted ${outcome_band.calibration.fitted_at}` : ""}. A range can still be wrong: news, a devaluation or a suspension can put the price outside it.`}
      </AppText>
      <Pressable accessibilityRole="link" onPress={() => router.push(routes.calibration)} className="min-h-[44px] justify-center">
        <AppText className="text-[11px] text-accent/60">See how often these ranges held →</AppText>
      </Pressable>
    </View>
  );
}
