import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { CompareChart } from "@/charts";
import { useTickers } from "@/providers/tickers";
import { fetchComparison } from "@/shared/api";
import { MAX_COMPARE_SYMBOLS } from "@/shared/constants";
import type { CompareResponse } from "@/shared/types";
import { AppText, Button, ChartSkeleton, EmptyState, IconButton, LearnTerm, Pill, PillRow, Screen, TextField } from "@/ui";
import {
  addCompareSymbol,
  buildCompareSeries,
  canCompare,
  compareRangeError,
  compareSuggestions,
  defaultCompareRange,
  RANGE_PRESETS,
  rangeEndingAt,
} from "./logic/compare";
import { RefreshableScroll } from "./RefreshableScroll";

/** Port of web `compare/page.tsx`, mobile branch (stat cards, not the table). */
export function CompareScreen() {
  const { tickers } = useTickers();
  const [initial] = useState(() => defaultCompareRange(new Date()));
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => compareSuggestions(tickers, input, selected), [tickers, input, selected]);
  const rangeError = compareRangeError(start, end);
  const ready = canCompare(selected, start, end);
  const series = useMemo(() => buildCompareSeries(data, selected), [data, selected]);

  const add = (sym: string) => {
    setSelected((prev) => addCompareSymbol(prev, sym));
    setInput("");
  };

  const compare = () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    fetchComparison(selected, "Daily", start, end)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  };

  const applyPreset = (months: number) => {
    const r = rangeEndingAt(new Date(), months);
    setStart(r.start);
    setEnd(r.end);
  };

  return (
    <Screen scroll={false}>
      <RefreshableScroll contentClassName="gap-4 p-4 pb-10">
        <AppText className="text-sm text-white/40">Select 2-5 stocks to compare their performance over time.</AppText>

        <View className="gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          {selected.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {selected.map((sym) => (
                <View key={sym} className="flex-row items-center gap-1 rounded-full border border-accent/20 bg-accent/10 pl-3">
                  <AppText className="font-mono text-xs text-accent">{sym}</AppText>
                  <IconButton icon="close" accessibilityLabel={`Remove ${sym}`} onPress={() => setSelected((p) => p.filter((s) => s !== sym))} />
                </View>
              ))}
            </View>
          )}

          {selected.length < MAX_COMPARE_SYMBOLS && (
            <View className="gap-1">
              <TextField
                label="Add symbol"
                placeholder="Add symbol..."
                value={input}
                onChangeText={setInput}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => suggestions[0] && add(suggestions[0].symbol)}
              />
              {suggestions.map((t) => (
                <Pressable
                  key={t.symbol}
                  testID={`suggestion-${t.symbol}`}
                  accessibilityRole="button"
                  onPress={() => add(t.symbol)}
                  className="min-h-[44px] flex-row items-center gap-2 rounded-lg px-3"
                >
                  <AppText className="font-mono text-xs text-white">{t.symbol}</AppText>
                  <AppText numberOfLines={1} className="flex-1 text-[11px] text-white/40">{t.name}</AppText>
                </Pressable>
              ))}
            </View>
          )}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="From"
                testID="compare-start"
                placeholder="YYYY-MM-DD"
                value={start}
                onChangeText={setStart}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="To"
                testID="compare-end"
                placeholder="YYYY-MM-DD"
                value={end}
                onChangeText={setEnd}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>
          {rangeError && <AppText className="text-xs text-loss">{rangeError}</AppText>}
          <PillRow>
            {RANGE_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} onPress={() => applyPreset(p.months)} />
            ))}
          </PillRow>

          <Button label="Compare" loading={loading} disabled={!ready || loading} onPress={compare} />
        </View>

        {error && (
          <View className="rounded-xl border border-loss/20 bg-loss/5 p-4">
            <AppText className="text-sm text-loss">{error}</AppText>
          </View>
        )}

        {loading ? (
          <ChartSkeleton height={300} />
        ) : data && !error ? (
          <View className="gap-4">
            <CompareChart dates={data.dates} series={series} height={300} />
            {data.stats && Object.keys(data.stats).length > 0 && (
              <View className="gap-3">
                <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                  <LearnTerm term="Total Return" explanation="The total percentage gain or loss over the selected period. Calculated as (end_price / start_price - 1) * 100.">
                    Return
                  </LearnTerm>
                  <LearnTerm term="Volatility" explanation="Standard deviation of daily returns. Higher = more price swings = more risk. Lower = calmer price action.">
                    Volatility
                  </LearnTerm>
                  <LearnTerm term="Max Drawdown" explanation="The worst peak-to-trough decline during the period. If max drawdown is -20%, the stock fell 20% from its highest point. Shows the worst-case loss scenario.">
                    Max DD
                  </LearnTerm>
                </View>
                {Object.entries(data.stats).map(([sym, s]) => (
                  <View key={sym} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <AppText className="mb-2 font-mono text-sm text-white">{sym}</AppText>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Return</AppText>
                        <AppText className={`font-mono text-xs ${s.total_return >= 0 ? "text-gain" : "text-loss"}`}>
                          {`${s.total_return >= 0 ? "+" : ""}${s.total_return.toFixed(2)}%`}
                        </AppText>
                      </View>
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Volatility</AppText>
                        <AppText className="font-mono text-xs text-white/60">{`${(s.volatility * 100).toFixed(2)}%`}</AppText>
                      </View>
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Max DD</AppText>
                        <AppText className="font-mono text-xs text-loss">{`${s.max_drawdown.toFixed(2)}%`}</AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : !error ? (
          <EmptyState title="Select at least 2 stocks and tap Compare to see results." />
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
