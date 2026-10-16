import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { routes } from "@/lib/links";
import { useMarket } from "@/providers/market";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useTickers } from "@/providers/tickers";
import { useWatchlist } from "@/providers/watchlist";
import { useScrollToTopOnTabPress } from "@/features/shell/useScrollToTopOnTabPress";
import { CARDS_PER_PAGE } from "@/shared/constants";
import { isMarketOpen } from "@/shared/markets";
import { COLORS } from "@/shared/theme";
import type { Ticker } from "@/shared/types";
import { AppText, Button, CardSkeleton, EmptyState, Screen, TextField, type IoniconName } from "@/ui";
import { DashboardControls } from "./DashboardControls";
import { useDashboardSnapshot } from "./hooks/useDashboardSnapshot";
import { useLiveUpgrade } from "./hooks/useLiveUpgrade";
import { useNow } from "./hooks/useNow";
import { upgradeQueue, watchlistPriceData } from "./logic/cards";
import {
  ALL_SECTORS,
  filterDividendPayers,
  filterTickers,
  indexLabel,
  indexTabs,
  pageSlice,
  sectorsFor,
  sortTickers,
  splitByFeed,
  type CompositeInterval,
  DEFAULT_SORT,
  type SortKey,
} from "./logic/dashboardFilters";
import { agoLabel, isTodaysSession, sessionLabel } from "./logic/marketClock";
import { useTabBarClearance } from "@/features/shell/useTabBarClearance";
import { MarketRegimeCard } from "./MarketRegimeCard";
import { RemoteSearchResults } from "./RemoteSearchResults";
import { StockCard } from "./StockCard";
import { WatchlistPanel } from "./WatchlistPanel";

/**
 * Port of the web dashboard (`egx-api-fe/src/app/page.tsx`).
 * - Pull-to-refresh replaces the Refresh button and sends `fresh`.
 * - "Load More" becomes FlatList `onEndReached` + a footer button.
 * - The sidebar (market condition, watchlist) sits above the grid.
 * - The search field is pinned above the list (the web's sticky bar).
 */
export function DashboardScreen() {
  const { tickers, loading } = useTickers();
  const { version: weightsVersion } = useScoreWeights();
  const { symbols: watchlistSymbols } = useWatchlist();
  const { market } = useMarket();
  const now = useNow();
  const { width } = useWindowDimensions();
  const clearance = useTabBarClearance();
  // Two compact cards per row on a phone, three on a tablet, one only on a
  // really narrow screen (under 340pt, e.g. the first iPhone SE). Compact,
  // because the full card at half width wrapped the change and clipped names.
  const columns = width >= 700 ? 3 : width >= 340 ? 2 : 1;

  const tabIds = useMemo(() => indexTabs(market), [market]);
  const tabs = useMemo(() => tabIds.map((id) => ({ id, label: indexLabel(market, id) })), [tabIds, market]);
  const sectors = useMemo(() => sectorsFor(market, tickers), [market, tickers]);

  const [index, setIndex] = useState(tabIds[0]);
  const [sector, setSector] = useState<string>(ALL_SECTORS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [dividendOnly, setDividendOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showComposite, setShowComposite] = useState(true);
  const [compositeInterval, setCompositeInterval] = useState<CompositeInterval>("Daily");
  const [showNoFeed, setShowNoFeed] = useState(false);

  // A market switch starts over on the new market's first tab with no search:
  // the old index, sector and query name nothing in the new list (a US "BRK"
  // left EG at "0 stocks"). Sort and the dividend toggle carry over. Adjusted
  // during render (not in an effect) so no frame filters the new market by the
  // old market's filters.
  const [shownMarket, setShownMarket] = useState(market.code);
  if (shownMarket !== market.code) {
    setShownMarket(market.code);
    setIndex(tabIds[0]);
    setSector(ALL_SECTORS);
    setSearch("");
    setPage(1);
  }

  // Any filter change returns to page 1 (the web did this in an effect).
  function resetting<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }

  const snap = useDashboardSnapshot(weightsVersion);
  const filtered = useMemo(
    () => filterTickers(tickers, { index, sector, search }),
    [tickers, index, sector, search]
  );
  // The WHOLE loaded list, not this tab's slice: a universe stock on another
  // tab is still a known listing, never a "more stocks" result.
  const knownSymbols = useMemo(() => new Set(tickers.map((t) => t.symbol.toUpperCase())), [tickers]);
  const { quoted, unquoted } = useMemo(() => splitByFeed(filtered, snap.noFeed), [filtered, snap.noFeed]);
  const payers = useMemo(
    () => filterDividendPayers(quoted, snap.cards, dividendOnly),
    [quoted, snap.cards, dividendOnly]
  );
  const sorted = useMemo(() => sortTickers(payers, snap.cards, sort), [payers, snap.cards, sort]);
  const { visible, hasMore, remaining } = pageSlice(sorted, page, CARDS_PER_PAGE);

  // Tapping Dashboard while already on it scrolls back to the top.
  const listRef = useRef<FlatList<Ticker>>(null);
  useScrollToTopOnTabPress(listRef);

  const { upgrade } = useLiveUpgrade({
    symbols: upgradeQueue(visible, watchlistSymbols, tickers),
    enabled: showComposite,
    snapshotLoaded: snap.snapshotLoaded,
    noFeed: snap.noFeed,
    interval: compositeInterval,
    weightsVersion,
    refreshKey: snap.refreshKey,
    setCards: snap.setCards,
  });

  const priceData = useMemo(() => watchlistPriceData(snap.cards), [snap.cards]);
  // One clock reading for the whole grid, so every card flips together.
  const marketClosed = !isMarketOpen(market, now);
  const today = new Date(now);
  const extra = useMemo(
    () => ({ cards: snap.cards, now, showComposite, compositeInterval }),
    [snap.cards, now, showComposite, compositeInterval]
  );
  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const renderCard = (t: Ticker, compact = false) => {
    const c = snap.cards[t.symbol.toUpperCase()];
    return (
      <StockCard
        symbol={t.symbol}
        name={t.name}
        sector={t.sector}
        price={c?.price}
        change={c?.change}
        changePct={c?.changePct}
        sparklineData={c?.sparkline}
        compositeScore={showComposite ? (c?.score ?? null) : null}
        compositeSignal={showComposite ? (c?.signal ?? null) : null}
        // Independent of the score toggle: a different axis (movement).
        riskBand={c?.riskBand}
        riskBandLabel={c?.riskBandLabel}
        interval={showComposite ? compositeInterval : undefined}
        changeInterval={showComposite ? compositeInterval : "Daily"}
        state={c?.state ?? "loading"}
        asOf={sessionLabel(c?.barDate)}
        isToday={isTodaysSession(c?.barDate, today)}
        fetchedAgo={agoLabel(c?.fetchedAt, now)}
        marketClosed={marketClosed}
        onRetry={() => upgrade([t.symbol])}
        compact={compact}
      />
    );
  };

  const header = (
    <View className="gap-4 px-1.5 pb-3">
      <DashboardControls
        tabs={tabs}
        index={index}
        onIndex={resetting(setIndex)}
        sector={sector}
        sectors={sectors}
        onSector={resetting(setSector)}
        quotedCount={quoted.length}
        unquotedCount={unquoted.length}
        sort={sort}
        onSort={resetting(setSort)}
        dividendOnly={dividendOnly}
        onToggleDividend={() => resetting(setDividendOnly)(!dividendOnly)}
        showComposite={showComposite}
        onToggleComposite={() => setShowComposite((v) => !v)}
        interval={compositeInterval}
        onInterval={setCompositeInterval}
      />
    </View>
  );

  const footer = (
    <View className="gap-4 px-1.5 pt-3">
      {/* Below an empty or short search result: listings outside the grid's universe. */}
      <RemoteSearchResults query={search} localCount={filtered.length} knownSymbols={knownSymbols} />
      {hasMore && (
        <Button label={`Load more (${remaining} remaining)`} variant="secondary" onPress={loadMore} />
      )}
      {/* Listed, not quoted: collapsed rather than removed, so a reader
          searching for one finds it and is told why it has no price. */}
      {!loading && unquoted.length > 0 && (
        <View className="border-t border-white/5 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showNoFeed }}
            onPress={() => setShowNoFeed((v) => !v)}
            className="min-h-[44px] flex-row items-center justify-between gap-2"
          >
            <AppText className="flex-1 text-sm text-white/40">
              {`No feed data (${unquoted.length})`}
              <AppText className="text-xs text-white/25">{"  listed, but not quoted by the data source"}</AppText>
            </AppText>
            <AppText className="text-xs text-white/40">{showNoFeed ? "Hide" : "Show"}</AppText>
          </Pressable>
          {showNoFeed && (
            <View className="mt-3 gap-3">
              {unquoted.map((t) => (
                <View key={t.symbol}>{renderCard(t)}</View>
              ))}
            </View>
          )}
        </View>
      )}
      {/* After the stocks, as on the web at phone width: the web's sidebar
          (market condition, then watchlist) stacks below the grid there. */}
      <MarketRegimeCard />
      <WatchlistPanel tickers={tickers} priceData={priceData} />
    </View>
  );

  return (
    <Screen scroll={false}>
      <View className="gap-3 border-b border-white/5 bg-charcoal-dark px-4 pb-3 pt-4">
        <View>
          <AppText className="font-sans-bold text-2xl text-white">{`${market.short_name} Market Overview`}</AppText>
          <AppText className="mt-1 text-sm text-white/40">
            Tap any card for detailed analysis. Pull down to refresh prices.
          </AppText>
        </View>
        {/* Labelled tools rather than two bare icons beside the title: a reader
            should not have to guess what ⇄ and a calendar glyph open. */}
        <View className="flex-row gap-2">
          <ToolButton icon="swap-horizontal" label="Compare" onPress={() => router.push(routes.compare)} />
          <ToolButton icon="calendar-outline" label="Dividends" onPress={() => router.push(routes.dividends)} />
        </View>
        <TextField
          label="Search"
          hideLabel
          testID="dashboard-search"
          placeholder="Filter by name or symbol..."
          value={search}
          onChangeText={resetting(setSearch)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        ref={listRef}
        key={`cols-${columns}`}
        testID="dashboard-list"
        data={loading ? [] : visible}
        numColumns={columns}
        keyExtractor={(t) => t.symbol}
        extraData={extra}
        renderItem={({ item }) => (
          <View style={{ width: `${100 / columns}%` }} className="p-1.5">
            {renderCard(item, columns > 1)}
          </View>
        )}
        contentContainerClassName="px-2.5 pt-3"
        contentContainerStyle={{ paddingBottom: 32 + clearance }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View className="gap-3 px-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View className="px-1.5">
              <EmptyState title="No stocks found matching your filters." />
            </View>
          )
        }
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={snap.refreshing}
            onRefresh={snap.refresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      />
    </Screen>
  );
}

function ToolButton({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "Compare" ? "Compare stocks" : "Dividend calendar"}
      onPress={onPress}
      className="min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 active:opacity-70"
    >
      <Ionicons name={icon} size={18} color={COLORS.accent} />
      <AppText className="font-sans-medium text-sm text-white/80">{label}</AppText>
    </Pressable>
  );
}
