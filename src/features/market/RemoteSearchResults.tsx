import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useMarket } from "@/providers/market";
import { AppText } from "@/ui";
import { FEW_LOCAL_MATCHES, useTickerSearch } from "./hooks/useTickerSearch";
import { stockDetailHref } from "./links";

export interface RemoteSearchResultsProps {
  query: string;
  /** How many stocks the dashboard itself matched. */
  localCount: number;
  /** Symbols the dashboard already shows; never repeated here. */
  knownSymbols: Set<string>;
}

/**
 * Listings outside the dashboard's universe (a US stock in no index), found by
 * name or symbol through /api/tickers/search. EG's universe is the whole
 * exchange, so EG never searches. A failed search renders nothing: the grid
 * above already answered.
 */
export function RemoteSearchResults({ query, localCount, knownSymbols }: RemoteSearchResultsProps) {
  const { market } = useMarket();
  const found = useTickerSearch(query, localCount < FEW_LOCAL_MATCHES);
  if (!found) return null;
  const rows = found.filter((r) => !knownSymbols.has(r.symbol.toUpperCase()));
  if (rows.length === 0) return null;

  return (
    <View testID="remote-search-results" className="gap-1 border-t border-white/5 pt-4">
      <AppText className="mb-1 font-sans-medium text-[10px] uppercase tracking-[1px] text-white/30">
        {`More ${market.short_name} stocks`}
      </AppText>
      {rows.map((r) => (
        <Pressable
          key={r.symbol}
          accessibilityRole="button"
          accessibilityLabel={`${r.symbol}, ${r.name}`}
          onPress={() => router.push(stockDetailHref(r.symbol))}
          className="min-h-[44px] flex-row items-center gap-3 border-b border-white/5 py-2 active:opacity-70"
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <AppText className="font-mono-semibold text-sm text-white">{r.symbol}</AppText>
              {r.kind === "fund" ? (
                <View className="rounded border border-white/15 px-1.5">
                  <AppText className="font-sans-medium text-[10px] text-white/60">ETF</AppText>
                </View>
              ) : null}
            </View>
            <AppText numberOfLines={1} className="text-xs text-white/50">
              {r.name}
            </AppText>
          </View>
          <AppText className="text-[11px] text-white/30">{r.exchange}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
