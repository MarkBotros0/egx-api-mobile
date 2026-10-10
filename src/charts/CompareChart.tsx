import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/ui";

import { CHART } from "./kit/palette";
import { XYChart } from "./kit/XYChart";
import type { RefLine, XYSeries } from "./kit/xyModel";

/** The web CompareChart's series colours, in order. */
export const COMPARE_COLORS = [
  "#4488ff", "#00ff88", "#ff3355", "#ffaa00",
  "#cc00ff", "#00ccff", "#ff6600", "#88ff00",
] as const;

export interface CompareChartProps {
  dates: string[];
  series: { symbol: string; values: (number | null)[] }[];
  height?: number;
}

const ZERO: RefLine[] = [{ id: "zero", y: 0, color: "rgba(255,255,255,0.15)" }];
const pct0 = (v: number) => `${v.toFixed(0)}%`;
const pct2 = (v: number) => `${v.toFixed(2)}%`;
const colorAt = (i: number) => COMPARE_COLORS[i % COMPARE_COLORS.length];

export function CompareChart({ dates, series, height = 400 }: CompareChartProps) {
  const xySeries = useMemo<XYSeries[]>(
    () =>
      series.map((s, i) => ({
        kind: "line",
        id: s.symbol,
        name: s.symbol,
        values: s.values,
        color: colorAt(i),
        width: 2,
        connectNulls: true,
      })),
    [series],
  );

  if (!dates.length || !series.length) {
    return (
      <View
        className="items-center justify-center rounded-xl border border-white/5 bg-white/[0.02]"
        style={{ height }}
      >
        <AppText className="text-sm text-white/30">Select stocks to compare</AppText>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <XYChart
        testID="compare-chart"
        labels={dates}
        series={xySeries}
        refLines={ZERO}
        height={height}
        yAxisWidth={50}
        axisLine
        tickColor={CHART.tick}
        tickSize={10}
        yTickFormat={pct0}
        readoutFormat={pct2}
      />
      <View className="mt-2 flex-row flex-wrap justify-center gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <View key={s.symbol} testID={`legend-${s.symbol}`} className="flex-row items-center gap-1.5">
            <View style={{ width: 14, height: 2, backgroundColor: colorAt(i) }} />
            <AppText className="text-[11px]" style={{ color: colorAt(i) }}>
              {s.symbol}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
