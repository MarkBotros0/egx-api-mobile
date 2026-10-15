import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { useMarket } from "@/providers/market";
import { fetchDividendHistory } from "@/shared/api";
import type { MarketCode } from "@/shared/markets";
import { AppText, Button, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { dayMonth } from "./logic/format";

const PAGE = 8; // years shown before "Show more"

function Shell({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Dividend History"
          explanation="The cash coupons this company has paid shareholders, per share, over the years — with the ex-date (own the share before it to receive that coupon). Amounts are gross, as reported; Egypt's 5-10% withholding comes off before the cash reaches you. The EGX publishes no forward calendar, so any 'expected' date here is only an estimate from past years, never a promise."
        >
          Dividend History
        </LearnTerm>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("dividend_dates"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn more →</AppText>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Empty({ note }: { note: string }) {
  return (
    <Shell>
      <View className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4">
        <AppText className="text-center text-xs text-white/50">{note}</AppText>
      </View>
    </Shell>
  );
}

/**
 * Self-fetching, so a slow Yahoo call can never hold up or fail the rest of
 * the stock page. No gain/loss colour: an amount carries no direction.
 */
/** `market`: a deep link's market, read without switching the app's; omitted, the app's. */
export function DividendHistoryCard({ symbol, market: linked }: { symbol: string; market?: MarketCode }) {
  const { market } = useMarket();
  const dataMarket = linked ?? market.code;
  const { data, error, loading } = useKeyedFetch(`divhist:${dataMarket}:${symbol}`, () =>
    fetchDividendHistory(symbol, { market: dataMarket })
  );
  const [shownCount, setShownCount] = useState(PAGE);

  if (loading) {
    return (
      <Shell>
        <View className="gap-2">
          <View className="h-4 w-full rounded bg-white/5" />
          <View className="h-4 w-4/5 rounded bg-white/5" />
          <View className="h-4 w-3/5 rounded bg-white/5" />
        </View>
      </Shell>
    );
  }
  if (error || !data || data.status === "unavailable") {
    return <Empty note="Dividend history is unavailable right now." />;
  }
  const { dividends, cadence } = data;
  if (dividends.length === 0) return <Empty note="No dividend history on record for this stock." />;

  const shown = dividends.slice(0, shownCount);
  const remaining = dividends.length - shown.length;
  const fullyExpanded = shownCount >= dividends.length;

  return (
    <Shell>
      <View className="gap-1.5">
        {shown.map((d) => (
          <View key={`${d.ex_date}-${d.amount}`} className="flex-row items-baseline justify-between gap-3 border-b border-white/[0.04] pb-1.5">
            <AppText className="font-mono text-xs text-white/40">{String(d.year)}</AppText>
            <View className="flex-1 flex-row items-baseline justify-end gap-1">
              <AppText className="font-mono-semibold text-sm text-white/90">{d.amount.toFixed(2)}</AppText>
              <AppText className="text-[10px] text-white/40">EGP</AppText>
            </View>
            <AppText className="w-16 text-right font-mono text-[11px] text-white/50">{dayMonth(d.ex_date)}</AppText>
          </View>
        ))}
      </View>

      {dividends.length > PAGE && (
        <View className="mt-2.5">
          <Button
            variant="secondary"
            label={fullyExpanded ? "Show less" : `Show ${Math.min(PAGE, remaining)} more — ${remaining} earlier`}
            onPress={() => setShownCount(fullyExpanded ? PAGE : Math.min(shownCount + PAGE, dividends.length))}
          />
        </View>
      )}

      {cadence.typical_month_name && (
        <AppText className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-white/45">
          {`Typically pays around ${cadence.typical_month_name}${cadence.payments_per_year && cadence.payments_per_year > 1 ? ` · ${cadence.payments_per_year}× a year` : ""}${cadence.last_ex_date ? ` · last ex-date ${dayMonth(cadence.last_ex_date)} ${cadence.last_ex_date.slice(0, 4)}` : ""}. `}
          <AppText className="text-[11px] text-white/30">Estimated from past years — the EGX sets no forward date.</AppText>
        </AppText>
      )}
    </Shell>
  );
}
