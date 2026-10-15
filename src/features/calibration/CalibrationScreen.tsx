/**
 * "Checking our work" — the app's own accuracy record (/api/calibration).
 *
 *  1. COVERAGE ALONE IS GAMEABLE: the band's width ships beside its hit
 *     rate, and the copy admits it is wide.
 *  2. THE FAILURES ARE ON THE SAME SCREEN AS THE SUCCESSES: a record that
 *     only lists what worked is marketing.
 */
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AppText, CardSkeleton, ErrorState, Screen } from "@/ui";
import { useMarket } from "@/providers/market";
import { fetchCalibration, type CalibrationResponse } from "@/shared/api";
import { learnHref } from "@/lib/links";

export function CalibrationScreen() {
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { market } = useMarket();
  // Another market's calibration (or failure) is not this one's.
  const [shownMarket, setShownMarket] = useState(market.code);
  if (shownMarket !== market.code) {
    setShownMarket(market.code);
    setData(null);
    setError(false);
  }

  useEffect(() => {
    let alive = true;
    fetchCalibration()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt, market.code]);

  if (error) {
    return (
      <Screen>
        <ErrorState
          message="Could not load the accuracy record."
          onRetry={() => {
            setError(false);
            setAttempt((a) => a + 1);
          }}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <View className="gap-4 py-8">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  const { forecast, risk_grade, what_failed } = data;

  return (
    <Screen scroll>
      <View className="pb-24 pt-8">
        <AppText accessibilityRole="header" className="font-sans-bold text-xl text-white">
          Checking our work
        </AppText>
        <AppText className="mt-2 text-sm leading-[22px] text-white/60">
          {"When this app says a range holds 9 times in 10, did it? Every number below was measured on "}
          <AppText className="font-mono text-sm text-white/80">{forecast.n_observations.toLocaleString()}</AppText>
          {" past checks against real Egyptian market history, and every one of them is re-runnable."}
        </AppText>

        <View className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <AppText className="font-sans-semibold text-sm text-white">Ranges: what we promised vs what happened</AppText>
          <View className="mt-3 gap-2">
            {forecast.bands.map((b) => {
              const close = Math.abs(b.delivered_pct - b.promised_pct) <= 2;
              return (
                <View key={b.claim} className="rounded-lg bg-white/[0.03] p-3">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <AppText className="flex-1 text-xs text-white/70">{b.claim}</AppText>
                    <View className="flex-row items-baseline">
                      <AppText className="font-mono text-xs text-white/40">{`said ${b.promised_pct}%`}</AppText>
                      <AppText className="mx-1.5 font-mono text-xs text-white/25">→</AppText>
                      <AppText className={`font-mono text-xs ${close ? "text-white" : "text-white/70"}`}>
                        {`was ${b.delivered_pct}%`}
                      </AppText>
                    </View>
                  </View>
                  {b.note ? (
                    <AppText className="mt-1 text-[10px] leading-[16px] text-white/30">{b.note}</AppText>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <AppText className="font-sans-medium text-[11px] text-white/60">
              {"How wide is that range? "}
              <AppText className="font-mono text-[11px] text-white/80">
                {`${forecast.sharpness.median_width_pct_of_spot}% of the share price`}
              </AppText>
            </AppText>
            <AppText className="mt-1 text-[10px] leading-[16px] text-white/35">
              {`${forecast.sharpness.note} Half the time the 3-month range is wider than ${forecast.sharpness.p25}% and narrower than ${forecast.sharpness.p75}% of today's price. That is a wide range, and it is meant to be — the market genuinely is that uncertain over three months.`}
            </AppText>
          </View>
        </View>

        <View className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <AppText className="font-sans-semibold text-sm text-white">Risk grade: how well it ordered stocks</AppText>
          <View className="mt-3 gap-2">
            {risk_grade.claims.map((c) => (
              <View key={c.claim} className="flex-row items-baseline justify-between gap-3 rounded-lg bg-white/[0.03] p-3">
                <AppText className="flex-1 text-xs text-white/70">{c.claim}</AppText>
                <View className="flex-row items-baseline gap-1">
                  <AppText className="font-mono text-xs text-white/80">{c.ic.toFixed(2)}</AppText>
                  <AppText className="font-mono text-xs text-white/35">{`(t ${c.t_non_overlapping})`}</AppText>
                </View>
              </View>
            ))}
          </View>
          <AppText className="mt-2 text-[10px] leading-[16px] text-white/30">
            A correlation of 0.03–0.05 counts as good in professional investing. These are far higher because how much
            a stock moves is genuinely predictable — unlike which way it moves.
          </AppText>
        </View>

        {/* Loss-tinted on purpose: this section IS the record of what failed. */}
        <View className="mt-4 rounded-xl border border-loss/10 bg-loss/[0.03] p-5">
          <AppText className="font-sans-semibold text-sm text-white">What we tested and dropped</AppText>
          <AppText className="mt-1 text-[11px] text-white/45">A record that only lists what worked is marketing.</AppText>
          <View className="mt-3 gap-3">
            {what_failed.map((f) => (
              <View key={f.claim} className="rounded-lg bg-white/[0.03] p-3">
                <AppText className="font-sans-medium text-xs text-white/70">{f.claim}</AppText>
                <AppText className="mt-1 font-mono text-[10px] text-white/40">{f.measured}</AppText>
                <AppText className="mt-1 text-[10px] leading-[16px] text-white/35">{f.outcome}</AppText>
              </View>
            ))}
          </View>
        </View>

        <AppText className="mt-6 text-[10px] leading-[16px] text-white/25">
          {`Measured ${forecast.fitted_at} on ${forecast.universe}.`}
        </AppText>
        <Pressable
          onPress={() => router.push(learnHref("risk-management"))}
          accessibilityRole="link"
          className="min-h-[44px] justify-center"
        >
          <AppText className="text-[11px] text-accent/60">Learn how to read these →</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
