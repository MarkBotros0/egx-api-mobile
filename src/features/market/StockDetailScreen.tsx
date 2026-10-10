import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IndicatorPanel, indicatorRows, PriceChart, priceRows, VolumeChart, volumeRows } from "@/charts";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useWatchlist } from "@/providers/watchlist";
import { fetchAnalysis } from "@/shared/api";
import { SR_LEVELS_DISPLAYED } from "@/shared/constants";
import { AppText, Button, ChartSkeleton, Screen } from "@/ui";
import { IntervalBarsControls, OverlayToggles } from "./ChartControls";
import { CompositeCard } from "./CompositeCard";
import { DividendHistoryCard } from "./DividendHistoryCard";
import { EntryExitCard } from "./EntryExitCard";
import { ForecastCard } from "./ForecastCard";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { KeyLevelsCard } from "./KeyLevelsCard";
import {
  atrPercent,
  compositeCallouts,
  DEFAULT_BARS,
  DEFAULT_OVERLAYS,
  latestNonNull,
  type BarCount,
  type ChartInterval,
  type OverlayState,
} from "./logic/stockDetail";
import { PEFreshnessBanner } from "./PEFreshnessBanner";
import { RefreshableScroll } from "./RefreshableScroll";
import { RiskGradeCard } from "./RiskGradeCard";
import { StatsPanel } from "./StatsPanel";

export interface StockDetailScreenProps {
  symbol: string;
  initialInterval: ChartInterval;
}

/**
 * Port of web `stock/[symbol]/page.tsx`, mobile branch: Key Statistics first,
 * composite card, levels + zones, overlays attached to the price chart, volume,
 * collapsible indicators, then the self-fetching risk / forecast / dividend
 * cards. Re-fetches when interval, history or score weights change.
 */
export function StockDetailScreen({ symbol, initialInterval }: StockDetailScreenProps) {
  const { add, remove, has } = useWatchlist();
  const { version: weightsVersion } = useScoreWeights();
  const [interval, setChartInterval] = useState<ChartInterval>(initialInterval);
  const [bars, setBars] = useState<BarCount>(DEFAULT_BARS);
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
  const [showIndicators, setShowIndicators] = useState(false);

  const analysis = useKeyedFetch(`${symbol}|${interval}|${bars}|${weightsVersion}`, () =>
    fetchAnalysis(symbol, interval, bars)
  );
  const data = analysis.data;
  const priceData = useMemo(() => (data ? priceRows(data) : []), [data]);
  const volumeData = useMemo(() => (data ? volumeRows(data) : []), [data]);
  const indicatorData = useMemo(() => (data ? indicatorRows(data) : []), [data]);

  const latestAtr = latestNonNull(data?.indicators.atr);
  const isWatched = has(symbol);
  // Four opaque letters are not what a reader recognises; drop the name when it just echoes the symbol.
  const companyName =
    data?.pe?.company_name && data.pe.company_name.toUpperCase() !== symbol.toUpperCase()
      ? data.pe.company_name
      : null;

  return (
    <Screen scroll={false}>
      {/* The web's sticky header: a fixed bar above the scroll view. */}
      <View className="flex-row items-center justify-between gap-3 border-b border-white/5 bg-charcoal-dark px-4 py-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline gap-2">
            <AppText className="font-mono-semibold text-xl text-white">{symbol}</AppText>
            {companyName && (
              <AppText numberOfLines={1} className="flex-1 font-sans-medium text-sm text-white/70">
                {companyName}
              </AppText>
            )}
          </View>
          {data && <AppText className="mt-0.5 text-xs text-white/40">{`${data.interval} · ${data.bars} bars`}</AppText>}
        </View>
        <Button
          label={isWatched ? "Watching" : "Watch"}
          variant={isWatched ? "primary" : "secondary"}
          icon={isWatched ? "star" : "star-outline"}
          onPress={() => (isWatched ? remove(symbol) : add(symbol))}
        />
      </View>

      <RefreshableScroll
        testID="stock-scroll"
        refreshing={analysis.refreshing}
        onRefresh={analysis.refresh}
        contentClassName="gap-4 px-4 py-4 pb-10"
      >
        <IntervalBarsControls interval={interval} bars={bars} onInterval={setChartInterval} onBars={setBars} />

        {analysis.loading ? (
          <View className="gap-4">
            <ChartSkeleton height={320} />
            <ChartSkeleton height={120} />
          </View>
        ) : analysis.error ? (
          <View className="items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-6">
            <AppText className="text-center text-sm text-loss">{analysis.error}</AppText>
            <Button label="Retry" variant="secondary" onPress={analysis.reload} />
          </View>
        ) : data ? (
          <>
            <PEFreshnessBanner />
            <StatsPanel
              stats={data.stats}
              latestRsi={latestNonNull(data.indicators.rsi)}
              latestVolatility={latestNonNull(data.indicators.volatility)}
              cumulativeReturn={latestNonNull(data.indicators.cumulative_returns)}
              beta={data.beta}
              atr={latestAtr}
              atrPct={atrPercent(latestAtr, data.stats.current_price)}
              crossovers={data.crossovers}
              pe={data.pe}
            />
            {data.composite_score && (
              <CompositeCard composite={data.composite_score} interval={interval} callouts={compositeCallouts(data)} />
            )}
            <KeyLevelsCard keyLevels={data.key_levels} />
            <EntryExitCard entryExit={data.entry_exit} />

            <View className="gap-2">
              <OverlayToggles value={overlays} onToggle={(k) => setOverlays((p) => ({ ...p, [k]: !p[k] }))} />
              <PriceChart
                data={priceData}
                overlays={overlays}
                supports={data.support_resistance?.supports?.slice(0, SR_LEVELS_DISPLAYED)}
                resistances={data.support_resistance?.resistances?.slice(0, SR_LEVELS_DISPLAYED)}
                fibonacci={data.fibonacci}
                trendlines={data.trendlines}
                height={320}
              />
            </View>
            <VolumeChart data={volumeData} />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showIndicators }}
              onPress={() => setShowIndicators((v) => !v)}
              className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <AppText className="font-sans-medium text-sm text-white/70">Technical Indicators</AppText>
              <AppText className="text-xs text-white/40">{showIndicators ? "Hide" : "Show"}</AppText>
            </Pressable>
            {showIndicators && <IndicatorPanel data={indicatorData} />}

            <RiskGradeCard symbol={symbol} />
            <ForecastCard forecast={data.forecast} symbol={symbol} />
            <DividendHistoryCard symbol={symbol} />
          </>
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
