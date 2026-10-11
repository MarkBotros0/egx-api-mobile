import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sparkline, scoreColor } from "@/charts";
import { RISK_BAND_COLOR } from "@/shared/riskBands";
import { COLORS } from "@/shared/theme";
import type { CompositeSignal } from "@/shared/types";
import { AppText } from "@/ui";
import { stockDetailHref } from "./links";
import type { CardState } from "./logic/cards";
import { changeText } from "./logic/format";
import { cardStamp, changeIntervalNote } from "./logic/marketClock";

export interface StockCardProps {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePct?: number;
  sparklineData?: number[];
  sector?: string;
  compositeSignal?: CompositeSignal | null;
  /** 0-100 composite — the number, never a Buy/Hold word. */
  compositeScore?: number | null;
  /** Calm..Wild: how much it moves, never which way. */
  riskBand?: string | null;
  riskBandLabel?: string | null;
  interval?: string;
  /** The bar the change covers — a month-over-month move on "Monthly". */
  changeInterval?: string;
  state?: CardState;
  /** The session this price belongs to, e.g. "2 Sep". */
  asOf?: string | null;
  /** `asOf` is today's (possibly still trading) session. */
  isToday?: boolean;
  /** "14s ago" — ticks live. */
  fetchedAgo?: string | null;
  /** The EGX is shut: show a static "Market closed" instead of a climbing age. */
  marketClosed?: boolean;
  onRetry?: () => void;
}

/** Port of web `StockCard` — five states, score, risk dot, session stamp, sparkline. */
export function StockCard({
  symbol,
  name,
  price,
  change,
  changePct,
  sparklineData,
  sector,
  compositeSignal,
  compositeScore,
  riskBand,
  riskBandLabel,
  interval,
  changeInterval,
  state = "live",
  asOf,
  isToday = false,
  fetchedAgo,
  marketClosed = false,
  onRetry,
}: StockCardProps) {
  const isPositive = (changePct ?? 0) >= 0;
  const changeColor = isPositive ? COLORS.gain : COLORS.loss;
  // A listed company the feed does not quote keeps its card, muted — this is
  // information about the feed, not a fault the reader can act on.
  const muted = state === "unavailable";
  const stamp = cardStamp({
    asOf: asOf ?? null,
    isToday,
    fetchedAgo: fetchedAgo ?? null,
    marketClosed,
  });
  const intervalNote = changeIntervalNote(changeInterval);
  const band = riskBand && state !== "unavailable" ? riskBand : null;

  let body;
  if (price !== undefined) {
    body = (
      <>
        <AppText className="font-mono-semibold text-lg text-white">{price.toFixed(2)}</AppText>
        <AppText className="font-mono text-xs" style={{ color: changeColor }}>
          {changeText(change, changePct)}
        </AppText>
        {intervalNote && (
          <AppText className="mt-0.5 text-[9px] uppercase tracking-wide text-white/30">{intervalNote}</AppText>
        )}
        {stamp && (
          <AppText className="mt-0.5 text-[9px] uppercase tracking-wide text-white/25">{stamp}</AppText>
        )}
      </>
    );
  } else if (state === "loading") {
    body = (
      <View testID="stockcard-loading" className="gap-1.5 py-1">
        <View className="h-5 w-16 rounded bg-white/10" />
        <View className="h-3 w-12 rounded bg-white/5" />
      </View>
    );
  } else if (state === "unavailable") {
    body = (
      <>
        <AppText className="text-xs text-white/35">No price feed</AppText>
        <AppText className="mt-0.5 text-[9px] text-white/25">Not quoted by the data source</AppText>
      </>
    );
  } else if (state === "failed" && onRetry) {
    // A nested Pressable takes the touch, so retrying never opens the stock.
    body = (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="min-h-[44px] justify-center self-start rounded-md border border-white/10 px-2.5"
      >
        <AppText className="text-[11px] text-white/50">Couldn&apos;t load — retry</AppText>
      </Pressable>
    );
  } else {
    body = <AppText className="font-mono text-sm text-white/30">--</AppText>;
  }

  return (
    <Pressable
      testID={`stockcard-${symbol}`}
      accessibilityRole="link"
      accessibilityLabel={`${symbol}, ${name}`}
      onPress={() => router.push(stockDetailHref(symbol, interval))}
      className={`rounded-xl border border-white/5 p-4 ${muted ? "bg-white/[0.01] opacity-60" : "bg-white/[0.03]"}`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <AppText className="font-mono-semibold text-sm text-white">{symbol}</AppText>
          <AppText numberOfLines={1} className="mt-0.5 text-xs text-white/40">
            {name}
          </AppText>
        </View>
        {/* Score (condition) above risk (movement): two axes, stacked. */}
        <View className="shrink-0 items-end gap-1">
          {compositeScore != null ? (
            <View
              className="items-center"
              accessibilityLabel={`Score ${compositeScore.toFixed(0)} of 100${compositeSignal ? `, ${compositeSignal}` : ""}`}
            >
              <AppText className="font-mono-semibold text-lg" style={{ color: scoreColor(compositeScore) }}>
                {compositeScore.toFixed(0)}
              </AppText>
              <AppText className="text-[8px] uppercase tracking-wider text-white/30">score</AppText>
            </View>
          ) : sector ? (
            <View className="rounded-full bg-accent/10 px-2 py-0.5">
              <AppText className="text-[10px] text-accent/70">{sector}</AppText>
            </View>
          ) : null}
          {band && (
            <View
              className="flex-row items-center gap-1"
              accessibilityLabel={`Risk: ${riskBandLabel ?? band} — how much it moves, not which way`}
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: RISK_BAND_COLOR[band] ?? COLORS.accent }}
              />
              <AppText className="text-[9px] uppercase tracking-wider text-white/40">
                {riskBandLabel ?? band}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <View className="mt-3 flex-row items-end justify-between gap-2">
        <View className="flex-1">{body}</View>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline values={sparklineData} width={64} height={32} />
        )}
      </View>
    </Pressable>
  );
}
