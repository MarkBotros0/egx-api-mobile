import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { learnHref } from "@/lib/links";
import type { FibonacciLevels, SupportLevel, TrendLine, TrendLines } from "@/shared/types";
import { AppText } from "@/ui";

import { CHART, withAlpha } from "./kit/palette";
import { XYChart } from "./kit/XYChart";
import type { RefLine, XYSeries } from "./kit/xyModel";

export interface PriceDataPoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  ema_12?: number | null;
  ema_26?: number | null;
  bollinger_upper?: number | null;
  bollinger_middle?: number | null;
  bollinger_lower?: number | null;
  trend_support?: number | null;
  trend_resistance?: number | null;
}

export interface PriceOverlays {
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  ema12?: boolean;
  ema26?: boolean;
  bollinger?: boolean;
  trendlines?: boolean;
}

export interface PriceChartProps {
  data: PriceDataPoint[];
  overlays?: PriceOverlays;
  supports?: SupportLevel[];
  resistances?: SupportLevel[];
  fibonacci?: FibonacciLevels | null;
  trendlines?: TrendLines | null;
  height?: number;
}

/** The web stock page's overlay colours — the pills and the lines must match. */
export const PRICE_OVERLAY_COLORS = {
  sma20: "#ffaa00",
  sma50: "#ff6600",
  sma200: "#ff0066",
  ema12: "#00ccff",
  ema26: "#cc00ff",
} as const;

const FIB = "#ffaa00";
const BB_FILL = withAlpha(CHART.accent, 0.1);
const BB_LINE = withAlpha(CHART.accent, 0.3);

// Support-green and resistance-red, the same convention the horizontal S/R
// lines use — slightly stronger so a diagonal reads as a drawn line.
export const TREND_SUPPORT_STROKE = withAlpha(CHART.gain, 0.7);
export const TREND_RESISTANCE_STROKE = withAlpha(CHART.loss, 0.7);

const NO_OVERLAYS: PriceOverlays = {};

type NumericKey = Exclude<keyof PriceDataPoint, "date">;

/** Bars whose date is one of the line's anchors — the only bars that get a dot. */
function anchorIndices(data: readonly PriceDataPoint[], line: TrendLine): number[] {
  const dates = new Set(line.anchors.map((a) => a.date));
  const out: number[] = [];
  data.forEach((d, i) => {
    if (dates.has(d.date)) out.push(i);
  });
  return out;
}

export function buildPriceSeries(
  data: readonly PriceDataPoint[],
  overlays: PriceOverlays,
  trendSupport: TrendLine | null,
  trendResistance: TrendLine | null,
): XYSeries[] {
  const col = (k: NumericKey) => data.map((d) => d[k]);
  const s: XYSeries[] = [];

  if (overlays.bollinger) {
    s.push({ kind: "band", id: "bb_band", lower: col("bollinger_lower"), upper: col("bollinger_upper"), fill: BB_FILL, connectNulls: true });
    s.push({ kind: "line", id: "bb_upper", name: "BB Upper", values: col("bollinger_upper"), color: BB_LINE, width: 1, connectNulls: true });
    s.push({ kind: "line", id: "bb_lower", name: "BB Lower", values: col("bollinger_lower"), color: BB_LINE, width: 1, connectNulls: true });
  }

  s.push({ kind: "line", id: "close", name: "Close", values: col("close"), color: CHART.white, width: 2.5 });

  if (overlays.sma20) {
    s.push({ kind: "line", id: "sma_20", name: "SMA 20", values: col("sma_20"), color: PRICE_OVERLAY_COLORS.sma20, width: 1, dash: "4 2", connectNulls: true });
  }
  if (overlays.sma50) {
    s.push({ kind: "line", id: "sma_50", name: "SMA 50", values: col("sma_50"), color: PRICE_OVERLAY_COLORS.sma50, width: 1, dash: "4 2", connectNulls: true });
  }
  if (overlays.ema12) {
    s.push({ kind: "line", id: "ema_12", name: "EMA 12", values: col("ema_12"), color: PRICE_OVERLAY_COLORS.ema12, width: 1, connectNulls: true });
  }
  if (overlays.ema26) {
    s.push({ kind: "line", id: "ema_26", name: "EMA 26", values: col("ema_26"), color: PRICE_OVERLAY_COLORS.ema26, width: 1, connectNulls: true });
  }
  if (overlays.sma200) {
    s.push({ kind: "line", id: "sma_200", name: "SMA 200", values: col("sma_200"), color: PRICE_OVERLAY_COLORS.sma200, width: 1, dash: "6 3", connectNulls: true });
  }

  // Linear because a trendline IS a straight line — a monotone spline would
  // bow it between the anchors it rests on. Null before the first anchor.
  if (trendSupport) {
    s.push({
      kind: "line",
      id: "trend_support",
      name: "Trend support",
      values: col("trend_support"),
      color: TREND_SUPPORT_STROKE,
      width: 1.5,
      dash: "6 3",
      curve: "linear",
      anchorIndices: anchorIndices(data, trendSupport),
      activeDot: false,
    });
  }
  if (trendResistance) {
    s.push({
      kind: "line",
      id: "trend_resistance",
      name: "Trend resistance",
      values: col("trend_resistance"),
      color: TREND_RESISTANCE_STROKE,
      width: 1.5,
      dash: "6 3",
      curve: "linear",
      anchorIndices: anchorIndices(data, trendResistance),
      activeDot: false,
    });
  }
  return s;
}

/**
 * Levels come from the full ~400-bar history while the chart may show 60
 * bars, so every one extends the domain — the web learned this when levels
 * named in the Key Levels card were missing from the chart below it.
 */
export function priceRefLines(
  supports?: readonly SupportLevel[],
  resistances?: readonly SupportLevel[],
  fibonacci?: FibonacciLevels | null,
): RefLine[] {
  const out: RefLine[] = [];
  supports?.forEach((s, i) =>
    out.push({
      id: `support-${i}`,
      y: s.price,
      color: withAlpha(CHART.gain, 0.4),
      dash: "4 4",
      label: `S ${s.price.toFixed(2)}`,
      labelSide: "left",
      labelSize: 9,
      labelColor: withAlpha(CHART.gain, 0.5),
      extendDomain: true,
    }),
  );
  resistances?.forEach((r, i) =>
    out.push({
      id: `resistance-${i}`,
      y: r.price,
      color: withAlpha(CHART.loss, 0.4),
      dash: "4 4",
      label: `R ${r.price.toFixed(2)}`,
      labelSide: "left",
      labelSize: 9,
      labelColor: withAlpha(CHART.loss, 0.5),
      extendDomain: true,
    }),
  );
  if (fibonacci) {
    for (const [label, price] of Object.entries(fibonacci.levels)) {
      out.push({
        id: `fib-${label}`,
        y: price,
        color: withAlpha(FIB, 0.25),
        dash: "2 4",
        label,
        labelSide: "right",
        labelSize: 8,
        labelColor: withAlpha(FIB, 0.4),
        extendDomain: true,
      });
    }
  }
  return out;
}

function TrendCaption({ support, resistance }: { support: TrendLine | null; resistance: TrendLine | null }) {
  const dir = (l: TrendLine) => (l.direction === "up" ? "rising" : "falling");
  // Says what was drawn and, just as important, what was not: the overlay on
  // with no line is a stock whose pivots do not line up, not a chart that forgot.
  return (
    <View className="mt-2">
      <AppText className="text-[10px] leading-relaxed text-white/30">
        {support || resistance ? (
          <>
            Trendline through the last 3 pivot{" "}
            {support ? (
              <AppText className="text-[10px]" style={{ color: TREND_SUPPORT_STROKE }}>
                lows ({dir(support)})
              </AppText>
            ) : null}
            {support && resistance ? " and " : null}
            {resistance ? (
              <AppText className="text-[10px]" style={{ color: TREND_RESISTANCE_STROKE }}>
                highs ({dir(resistance)})
              </AppText>
            ) : null}
            , dots mark the anchors.
          </>
        ) : (
          "No trendline: the last 3 pivots do not line up, or price has not respected the line."
        )}
      </AppText>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(learnHref("trendlines"))}
        className="min-h-[44px] justify-center self-start"
      >
        <AppText className="text-[10px] text-accent/60">Learn more →</AppText>
      </Pressable>
    </View>
  );
}

export function PriceChart({
  data,
  overlays = NO_OVERLAYS,
  supports,
  resistances,
  fibonacci,
  trendlines,
  height = 400,
}: PriceChartProps) {
  const trendSupport = overlays.trendlines ? (trendlines?.support ?? null) : null;
  const trendResistance = overlays.trendlines ? (trendlines?.resistance ?? null) : null;
  const labels = useMemo(() => data.map((d) => d.date), [data]);
  const series = useMemo(
    () => buildPriceSeries(data, overlays, trendSupport, trendResistance),
    [data, overlays, trendSupport, trendResistance],
  );
  const refLines = useMemo(() => priceRefLines(supports, resistances, fibonacci), [supports, resistances, fibonacci]);

  if (!data.length) {
    return (
      <View
        className="items-center justify-center rounded-xl border border-white/5 bg-white/[0.02]"
        style={{ height }}
      >
        <AppText className="text-sm text-white/30">No price data available</AppText>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <XYChart
        testID="price-chart"
        labels={labels}
        series={series}
        refLines={refLines}
        height={height}
        yAxisWidth={48}
        xMinTickGap={80}
        axisLine
        tickColor={CHART.tick}
        tickSize={10}
      />
      {overlays.trendlines ? <TrendCaption support={trendSupport} resistance={trendResistance} /> : null}
    </View>
  );
}
