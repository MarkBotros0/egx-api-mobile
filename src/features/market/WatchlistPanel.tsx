import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sparkline } from "@/charts";
import { stockHref } from "@/lib/links";
import { useWatchlist } from "@/providers/watchlist";
import { COLORS } from "@/shared/theme";
import type { Ticker } from "@/shared/types";
import { AppText, IconButton } from "@/ui";
import type { WatchlistPrice } from "./logic/cards";
import { pctText } from "./logic/format";

interface WatchlistPanelProps {
  tickers?: Ticker[];
  priceData?: Record<string, WatchlistPrice>;
}

function WatchlistRow({
  symbol,
  name,
  price,
  changePct,
  sparkline,
  onRemove,
}: {
  symbol: string;
  name?: string;
  price?: number;
  changePct?: number;
  sparkline?: number[];
  onRemove: () => void;
}) {
  const color = (changePct ?? 0) >= 0 ? COLORS.gain : COLORS.loss;
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] pl-3">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(stockHref(symbol))}
        className="min-h-[44px] flex-1 flex-row items-center gap-3 py-2.5"
      >
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <AppText className="font-mono-semibold text-sm text-white">{symbol}</AppText>
            {price !== undefined && (
              <AppText className="font-mono text-[11px]" style={{ color }}>
                {pctText(changePct)}
              </AppText>
            )}
          </View>
          {name && (
            <AppText numberOfLines={1} className="text-[11px] text-white/40">
              {name}
            </AppText>
          )}
        </View>
        {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} width={56} height={28} />}
        {price !== undefined ? (
          <AppText className="font-mono-semibold text-sm text-white">{price.toFixed(2)}</AppText>
        ) : (
          <AppText className="font-mono text-xs text-white/30">--</AppText>
        )}
      </Pressable>
      <IconButton
        icon="trash-outline"
        tone="danger"
        accessibilityLabel={`Remove ${symbol} from watchlist`}
        onPress={onRemove}
      />
    </View>
  );
}

/** Port of the web `WatchlistPanel` (the dashboard sidebar). */
export function WatchlistPanel({ tickers, priceData }: WatchlistPanelProps) {
  const { symbols, loading, remove } = useWatchlist();
  const byCode = useMemo(() => {
    const m = new Map<string, Ticker>();
    for (const t of tickers ?? []) m.set(t.symbol.toUpperCase(), t);
    return m;
  }, [tickers]);

  const header = (
    <View className="mb-3 flex-row items-center justify-between">
      <AppText className="font-sans-semibold text-sm text-white">Watchlist</AppText>
      {symbols.length > 0 && (
        <View className="rounded-full bg-white/5 px-2 py-0.5">
          <AppText className="font-sans-medium text-[10px] text-white/50">{symbols.length}</AppText>
        </View>
      )}
    </View>
  );

  if (loading && !symbols.length) {
    return (
      <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {header}
        <AppText className="text-xs text-white/30">Loading...</AppText>
      </View>
    );
  }

  if (!symbols.length) {
    return (
      <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {header}
        <AppText className="text-xs leading-relaxed text-white/40">
          Your watchlist is empty. Tap Watch on any stock page to track it here.
        </AppText>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      {header}
      <View className="gap-2">
        {symbols.map((sym) => {
          const pd = priceData?.[sym.toUpperCase()];
          return (
            <WatchlistRow
              key={sym}
              symbol={sym}
              name={byCode.get(sym.toUpperCase())?.name}
              price={pd?.price}
              changePct={pd?.changePct}
              sparkline={pd?.sparkline}
              onRemove={() => remove(sym)}
            />
          );
        })}
      </View>
    </View>
  );
}
