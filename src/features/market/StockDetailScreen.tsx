import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IndicatorPanel, indicatorRows, PriceChart, priceRows, VolumeChart, volumeRows } from "@/charts";
import { useMarket } from "@/providers/market";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useWatchlist } from "@/providers/watchlist";
import { fetchAnalysis } from "@/shared/api";
import { SR_LEVELS_DISPLAYED } from "@/shared/constants";
import { withMarketDefaults, type MarketCode } from "@/shared/markets";
import { Stack } from "expo-router";

import { AppText, Button, ChartSkeleton, IconButton, Screen } from "@/ui";
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
import { PEFreshnessBanner } from "@/features/common/PEFreshnessBanner";
import { RefreshableScroll } from "./RefreshableScroll";
import { RiskGradeCard } from "./RiskGradeCard";
import { StatsPanel } from "./StatsPanel";

export interface StockDetailScreenProps {
  symbol: string;
  initialInterval: ChartInterval;
  /**
   * A deep link's `?market=`: this page's data comes from that market without
   * switching the app's. Omitted, the page follows the app's market.
   */
  market?: MarketCode;
}

/**
 * Port of web `stock/[symbol]/page.tsx`, mobile branch: Key Statistics first,
 * composite card, levels + zones, overlays attached to the price chart, volume,
 * collapsible indicators, then the self-fetching risk / forecast / dividend
 * cards. Re-fetches when interval, history or score weights change.
 */
export function StockDetailScreen({ symbol, initialInterval, market: linkedMarket }: StockDetailScreenProps) {
  const { version: weightsVersion } = useScoreWeights();
  const { market, markets } = useMarket();
  // Pinned only when the link names the OTHER market; otherwise follow the app.
  const pinned = linkedMarket && linkedMarket !== market.code ? linkedMarket : null;
  const dataMarket = pinned ?? market.code;
  // The facts of the market this stock trades on (benchmark, currency).
  const dataMarketInfo = markets.find((m) => m.code === dataMarket) ?? market;
  // Copy names the STOCK's market even before /api/markets has listed it: a
  // deep-linked US stock on a cold start must not read "Egyptian".
  const dataAdjective =
    markets.find((m) => m.code === dataMarket)?.adjective ??
    (dataMarket === market.code ? market.adjective : withMarketDefaults({ code: dataMarket }).adjective);
  const [interval, setChartInterval] = useState<ChartInterval>(initialInterval);
  const [bars, setBars] = useState<BarCount>(DEFAULT_BARS);
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
  const [showIndicators, setShowIndicators] = useState(false);

  const analysis = useKeyedFetch(`${dataMarket}|${symbol}|${interval}|${bars}|${weightsVersion}`, () =>
    fetchAnalysis(symbol, interval, bars, { market: dataMarket })
  );
  const data = analysis.data;
  // The response names its currency; an older backend falls back to the data market's.
  const currency = data?.currency ?? dataMarketInfo.currency;
  const priceData = useMemo(() => (data ? priceRows(data) : []), [data]);
  const volumeData = useMemo(() => (data ? volumeRows(data) : []), [data]);
  const indicatorData = useMemo(() => (data ? indicatorRows(data) : []), [data]);

  const latestAtr = latestNonNull(data?.indicators.atr);
  // Four opaque letters are not what a reader recognises; drop the name when it just echoes the symbol.
  const companyName =
    data?.pe?.company_name && data.pe.company_name.toUpperCase() !== symbol.toUpperCase()
      ? data.pe.company_name
      : null;

  return (
    <Screen scroll={false}>
      {/* Watch lives in the top bar as a star, beside the symbol the bar
          already shows — not as a second header repeating the symbol. */}
      <Stack.Screen
        options={{
          // No star on another market's stock: the watchlist is this market's list.
          headerRight: () => (pinned ? null : <WatchStarButton symbol={symbol} />),
          // iOS 26 draws a glass pill behind a headerRight view; as a custom
          // item the star can opt out of it.
          unstable_headerRightItems: () =>
            pinned
              ? []
              : [{ type: "custom", element: <WatchStarButton symbol={symbol} />, hidesSharedBackground: true }],
        }}
      />
      <RefreshableScroll
        testID="stock-scroll"
        refreshing={analysis.refreshing}
        onRefresh={analysis.refresh}
        contentClassName="gap-4 px-4 pb-10 pt-1"
      >
        {/* Scrolls with the page: pinned, it took a strip off every screen. */}
        {companyName || data ? (
          <View>
            {companyName ? (
              <AppText numberOfLines={1} className="font-sans-medium text-base text-white/80">
                {companyName}
              </AppText>
            ) : null}
            {data ? <AppText className="mt-0.5 text-xs text-white/40">{`${data.interval} · ${data.bars} bars`}</AppText> : null}
          </View>
        ) : null}
        <IntervalBarsControls interval={interval} bars={bars} onInterval={setChartInterval} onBars={setBars} />
        {analysis.refreshError && (
          <AppText className="text-xs text-white/50" testID="refresh-error">
            Couldn&apos;t refresh — showing the last loaded data
          </AppText>
        )}

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
            <PEFreshnessBanner market={dataMarket} />
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
              currency={currency}
              market={dataMarketInfo}
            />
            {data.composite_score && (
              <CompositeCard
                composite={data.composite_score}
                interval={interval}
                callouts={compositeCallouts(data)}
                market={dataMarketInfo}
              />
            )}
            <KeyLevelsCard keyLevels={data.key_levels} currency={currency} />
            <EntryExitCard entryExit={data.entry_exit} currency={currency} />

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

            <RiskGradeCard symbol={symbol} market={dataMarket} />
            <ForecastCard
              forecast={data.forecast}
              symbol={symbol}
              currency={currency}
              adjective={dataAdjective}
              market={dataMarket}
            />
            {/* EG only until US dividend history ships (sub-project 4). */}
            {dataMarket === "EG" && <DividendHistoryCard symbol={symbol} market={dataMarket} />}
          </>
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}

/** The top bar's watch toggle: a star, filled and accent while watched. */
export function WatchStarButton({ symbol }: { symbol: string }) {
  const { add, remove, has } = useWatchlist();
  const watched = has(symbol);
  return (
    <IconButton
      icon={watched ? "star" : "star-outline"}
      tone={watched ? "accent" : "default"}
      selected={watched}
      accessibilityLabel={watched ? "Watching — remove from watchlist" : "Add to watchlist"}
      onPress={() => (watched ? remove(symbol) : add(symbol))}
    />
  );
}
