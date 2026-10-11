import { Text } from "react-native";

/**
 * Stand-in for `@/charts` in screen tests. Stubs the chart components
 * (PriceChart, VolumeChart, IndicatorPanel, CompareChart, CompositeGauge,
 * Sparkline, MonteCarloChart, CorrelationHeatmap) and `scoreColor`; each stub
 * records its props through `chartRender` so a test can assert what a screen
 * passed to a chart. The pure row builders (priceRows, volumeRows,
 * indicatorRows) are the real ones. Other `@/charts` exports are not provided
 * (a screen that needs one must extend this file). Use with:
 *   jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));
 */
export const chartRender = jest.fn<void, [string, Record<string, unknown>]>();

export function lastChartProps(name: string): Record<string, unknown> | undefined {
  const calls = chartRender.mock.calls.filter(([n]) => n === name);
  return calls.length ? calls[calls.length - 1][1] : undefined;
}

function stub(name: string) {
  function ChartStub(props: Record<string, unknown>) {
    chartRender(name, props);
    return <Text testID={`chart-${name}`}>{name}</Text>;
  }
  ChartStub.displayName = name;
  return ChartStub;
}

export const PriceChart = stub("PriceChart");
export const VolumeChart = stub("VolumeChart");
export const IndicatorPanel = stub("IndicatorPanel");
export const CompareChart = stub("CompareChart");
export const CompositeGauge = stub("CompositeGauge");
export const Sparkline = stub("Sparkline");
export const MonteCarloChart = stub("MonteCarloChart");
export const CorrelationHeatmap = stub("CorrelationHeatmap");

export function scoreColor(score: number): string {
  return score >= 60 ? "#00ff88" : score >= 40 ? "#4488ff" : "#ff3355";
}

export const { priceRows, volumeRows, indicatorRows } = jest.requireActual("@/charts/analysisRows");
