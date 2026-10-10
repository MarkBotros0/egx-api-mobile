// Public surface of the chart kit. Screens import charts from "@/charts" only.
export { Sparkline, sparklineModel, type SparklineProps } from "./Sparkline";
export {
  ALLOCATION_COLORS,
  AllocationBar,
  AllocationDonut,
  allocationSlices,
  donutArcs,
  type AllocationProps,
  type AllocationSlice,
} from "./Allocation";
export { CompositeGauge, scoreColor, type CompositeGaugeProps } from "./CompositeGauge";
export {
  PRICE_OVERLAY_COLORS,
  PriceChart,
  TREND_RESISTANCE_STROKE,
  TREND_SUPPORT_STROKE,
  buildPriceSeries,
  priceRefLines,
  type PriceChartProps,
  type PriceDataPoint,
  type PriceOverlays,
} from "./PriceChart";
export { VolumeChart, volumeBarColors, type VolumeChartProps, type VolumeDataPoint } from "./VolumeChart";
export { IndicatorPanel, type IndicatorDataPoint, type IndicatorPanelProps } from "./IndicatorPanel";
export { COMPARE_COLORS, CompareChart, type CompareChartProps } from "./CompareChart";
export {
  MonteCarloChart,
  formatOutcome,
  lossChanceToneClass,
  monteCarloSeries,
  outcomeToneClass,
  type MonteCarloChartProps,
} from "./MonteCarloChart";
export {
  CorrelationHeatmap,
  cellColorClass,
  cellTextClass,
  correlationPairs,
  type CorrelationHeatmapProps,
  type CorrelationPair,
} from "./CorrelationHeatmap";
