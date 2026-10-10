import { useMemo } from "react";
import { View } from "react-native";
import { scaleLinear } from "d3-scale";
import Svg, { Path } from "react-native-svg";

import { CHART } from "./kit/palette";
import { linePath } from "./kit/paths";
import { computeDomain, xPositions } from "./kit/scales";

export interface SparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
}

/**
 * Colour is the move across the window the line DRAWS (~30 sessions), not
 * today's single-bar change: a stock down 22% on the month that ticked up
 * today must not draw a falling line in gain-green (web StockCard/Watchlist).
 */
export function sparklineModel(
  values: readonly number[],
  width: number,
  height: number,
): { d: string; color: string; up: boolean } | null {
  const vals = values.filter((v) => Number.isFinite(v));
  if (vals.length < 2 || width <= 2 || height <= 2) return null;
  const up = vals[vals.length - 1] >= vals[0];
  const y = scaleLinear()
    .domain(computeDomain([vals]))
    .range([height - 1, 1]);
  const { xs } = xPositions(vals.length, 1, width - 1, "point");
  const d = linePath(
    vals.map((v, i) => ({ x: xs[i], y: y(v) })),
    { curve: "monotone" },
  );
  return d ? { d, color: up ? CHART.gain : CHART.loss, up } : null;
}

export function Sparkline({ values, width = 64, height = 32 }: SparklineProps) {
  const model = useMemo(() => sparklineModel(values, width, height), [values, width, height]);
  if (!model) return null;
  return (
    <View testID="sparkline" accessible accessibilityLabel={model.up ? "Trend up" : "Trend down"} style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={model.d} stroke={model.color} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}
