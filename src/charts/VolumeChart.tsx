import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/ui";

import { formatCompact } from "./kit/format";
import { CHART, withAlpha } from "./kit/palette";
import { finiteOrNull } from "./kit/scales";
import { XYChart } from "./kit/XYChart";
import type { XYSeries } from "./kit/xyModel";

export interface VolumeDataPoint {
  date: string;
  volume: number;
  close: number;
  open: number;
  /** Previous session's close — drives the up/down colouring. */
  prevClose?: number;
}

export interface VolumeChartProps {
  data: VolumeDataPoint[];
  height?: number;
}

const UP = withAlpha(CHART.gain, 0.5);
const DOWN = withAlpha(CHART.loss, 0.5);
const FROM_ZERO = { min: 0 };

/**
 * An "up day" is close vs the PREVIOUS close — the definition used by the
 * price change, the sparkline and the backend's volume/price confirmation.
 */
export function volumeBarColors(data: readonly VolumeDataPoint[]): string[] {
  return data.map((d, i) => {
    const reference =
      finiteOrNull(d.prevClose) ??
      finiteOrNull(data[i - 1]?.close) ??
      finiteOrNull(d.open);
    const close = finiteOrNull(d.close);
    return close !== null && reference !== null && close >= reference
      ? UP
      : DOWN;
  });
}

export function VolumeChart({ data, height = 120 }: VolumeChartProps) {
  const labels = useMemo(() => data.map((d) => d.date), [data]);
  const series = useMemo<XYSeries[]>(() => {
    const colors = volumeBarColors(data);
    return [
      {
        kind: "bars",
        id: "volume",
        name: "Volume",
        values: data.map((d) => d.volume),
        colorAt: (_v, i) => colors[i],
      },
    ];
  }, [data]);

  if (!data.length) return null;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <AppText className="mb-2 text-xs text-white/40">Volume</AppText>
      <XYChart
        testID="volume-chart"
        labels={labels}
        series={series}
        height={height}
        yDomain={FROM_ZERO}
        yAxisWidth={45}
        xMinTickGap={80}
        verticalGrid={false}
        yTickFormat={formatCompact}
        readoutFormat={formatCompact}
      />
    </View>
  );
}
