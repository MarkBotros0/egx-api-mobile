import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { fetchDividendCalendar } from "@/shared/api";
import { AppText, IconButton, Pill, PillRow, Screen, TableSkeleton } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import {
  dayTitle,
  indexCalendar,
  isoDay,
  listedFor,
  monthCells,
  monthTitle,
  shiftMonth,
  viewFromIso,
  WEEKDAYS,
  yearOptions,
  type MonthView,
} from "./logic/dividendCalendar";
import { RefreshableScroll } from "./RefreshableScroll";

const CELL_WIDTH = "14.2857%"; // 7 columns

/**
 * Port of web `dividends/page.tsx`: a month grid paged by ‹ › and a year pill
 * row (the web's two <select>s), the selected day's payers beneath. These are
 * LAST-PAID ex-dates — the EGX publishes no forward calendar, and the banner
 * says so. Nothing is gain/loss coloured.
 */
export function DividendCalendarScreen() {
  const cal = useKeyedFetch("dividend-calendar", fetchDividendCalendar);
  const data = cal.data;
  const index = useMemo(() => indexCalendar(data?.stocks ?? []), [data]);
  const [picked, setPicked] = useState<MonthView | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Until the user pages, show the most recent month that has data.
  const view = picked ?? viewFromIso(index.latest);

  const go = (v: MonthView) => {
    setPicked(v);
    setSelectedDay(null);
  };

  let body;
  if (cal.loading) {
    body = <TableSkeleton rows={6} />;
  } else if (cal.error) {
    body = (
      <View className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <AppText className="text-sm text-white/70">The dividend calendar didn&apos;t load.</AppText>
        <AppText className="mt-1 text-xs text-white/40">{cal.error}</AppText>
      </View>
    );
  } else if (data && view) {
    const listed = listedFor(data.stocks, index.byDate, view, selectedDay);
    body = (
      <>
        <View testID="calendar-month" className="flex-row items-center gap-2">
          <IconButton icon="chevron-back" accessibilityLabel="Previous month" onPress={() => go(shiftMonth(view, -1))} />
          <AppText className="flex-1 text-center font-sans-semibold text-base text-white">{monthTitle(view)}</AppText>
          <IconButton icon="chevron-forward" accessibilityLabel="Next month" onPress={() => go(shiftMonth(view, 1))} />
        </View>
        <PillRow>
          {yearOptions(index.years, view.y).map((yr) => (
            <Pill key={yr} label={String(yr)} active={yr === view.y} onPress={() => go({ y: yr, m: view.m })} />
          ))}
        </PillRow>

        <View className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <View className="flex-row flex-wrap">
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ width: CELL_WIDTH }} className="py-1">
                <AppText className="text-center font-sans-medium text-[10px] uppercase tracking-wider text-white/30">{w}</AppText>
              </View>
            ))}
            {monthCells(view.y, view.m).map((day, i) => {
              if (day === null) return <View key={`x${i}`} style={{ width: CELL_WIDTH }} />;
              const iso = isoDay(view.y, view.m, day);
              const hits = index.byDate.get(iso);
              const isSelected = selectedDay === iso;
              return (
                <View key={iso} style={{ width: CELL_WIDTH }} className="p-0.5">
                  <Pressable
                    testID={`day-${iso}`}
                    disabled={!hits}
                    accessibilityRole="button"
                    accessibilityLabel={hits ? `${day}, ${hits.length} ex-dividend` : String(day)}
                    accessibilityState={{ selected: isSelected, disabled: !hits }}
                    onPress={() => setSelectedDay(isSelected ? null : iso)}
                    className={`aspect-square items-center justify-center rounded-lg ${isSelected ? "bg-accent/20" : hits ? "bg-white/[0.06]" : ""}`}
                  >
                    <AppText className={`text-xs ${isSelected ? "text-accent" : hits ? "text-white/80" : "text-white/25"}`}>
                      {String(day)}
                    </AppText>
                    {hits && <AppText className="font-mono text-[9px] text-accent/80">{String(hits.length)}</AppText>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-2 flex-row items-baseline gap-2.5">
          <AppText className="font-sans-semibold text-base text-white">
            {selectedDay ? dayTitle(selectedDay) : monthTitle(view)}
          </AppText>
          <AppText className="font-mono text-xs text-white/35">{String(listed.length)}</AppText>
          {selectedDay && (
            <Pressable onPress={() => setSelectedDay(null)} className="ml-auto min-h-[44px] justify-center">
              <AppText className="text-[11px] text-accent/70">Show whole month</AppText>
            </Pressable>
          )}
        </View>

        {listed.length === 0 ? (
          <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
            <AppText className="text-sm text-white/50">{`No dividends on record for ${monthTitle(view)}.`}</AppText>
          </View>
        ) : (
          <View className="gap-2">
            {listed.map((s) => (
              <View key={s.symbol + s.ex_date} className="flex-row items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(stockHref(s.symbol))}
                  className="min-h-[44px] justify-center rounded-lg bg-accent/10 px-3"
                >
                  <AppText className="font-mono text-xs text-accent/90">{s.symbol}</AppText>
                </Pressable>
                <View className="min-w-0 flex-1">
                  {s.name && s.name.toUpperCase() !== s.symbol.toUpperCase() && (
                    <AppText numberOfLines={1} className="text-[13px] text-white/70">{s.name}</AppText>
                  )}
                  <AppText className="text-[11px] text-white/40">{`ex-date ${dayTitle(s.ex_date)}`}</AppText>
                </View>
                <View className="items-end">
                  <View className="flex-row items-baseline gap-1">
                    <AppText className="font-mono-semibold text-sm text-white/90">{s.amount != null ? s.amount.toFixed(2) : "—"}</AppText>
                    <AppText className="text-[10px] text-white/40">EGP</AppText>
                  </View>
                  {s.dividend_yield != null && s.dividend_yield > 0 && (
                    <AppText className="font-mono text-[11px] text-white/45">{`${s.dividend_yield.toFixed(1)}%`}</AppText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  } else {
    body = (
      <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
        <AppText className="text-sm text-white/50">No dividends on record yet.</AppText>
      </View>
    );
  }

  return (
    <Screen scroll={false}>
      <RefreshableScroll testID="dividends-scroll" refreshing={cal.refreshing} onRefresh={cal.refresh} contentClassName="gap-4 px-4 py-4 pb-10">
        {cal.refreshError && (
          <AppText className="text-xs text-white/50" testID="refresh-error">
            Couldn&apos;t refresh — showing the last loaded data
          </AppText>
        )}
        {data && (
          <AppText className="text-xs text-white/40">
            {`${data.count} EGX ${data.count === 1 ? "stock" : "stocks"} with a dividend on record`}
          </AppText>
        )}
        <View className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <AppText className="text-[13px] leading-relaxed text-white/60">
            These are the most recent coupons on record — their ex-dates (own the share before it to get the coupon). The EGX publishes no forward calendar, so future dates aren&apos;t shown; most companies pay once, around April–May.
          </AppText>
        </View>
        {body}
      </RefreshableScroll>
    </Screen>
  );
}
