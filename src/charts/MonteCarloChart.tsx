import { useMemo } from "react";
import { View } from "react-native";

import type { MonteCarloResult } from "@/shared/types";
import { AppText } from "@/ui";

import { formatCompact } from "./kit/format";
import { CHART, withAlpha } from "./kit/palette";
import { finiteOrNull } from "./kit/scales";
import { XYChart } from "./kit/XYChart";
import type { LineSeries, XYSeries } from "./kit/xyModel";

export interface MonteCarloChartProps {
  data: MonteCarloResult;
}

/**
 * Percentile outcomes arrive as growth MULTIPLIERS (1.0 = flat). Sign and
 * colour are read off the value — the "best case" can be a loss for a
 * portfolio with strong downward drift.
 */
export function formatOutcome(multiplier: number): string {
  const pct = (multiplier - 1) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function outcomeToneClass(multiplier: number): "text-gain" | "text-loss" {
  return multiplier >= 1 ? "text-gain" : "text-loss";
}

export function lossChanceToneClass(p: number): "text-loss" | "text-yellow-400" | "text-gain" {
  return p > 0.5 ? "text-loss" : p > 0.3 ? "text-yellow-400" : "text-gain";
}

type Pctl = "p5" | "p25" | "p50" | "p75" | "p95";
const NAMES: Record<Pctl, string> = {
  p95: "Best 5%",
  p75: "75th pctl",
  p50: "Median",
  p25: "25th pctl",
  p5: "Worst 5%",
};

export function monteCarloSeries(data: MonteCarloResult): { labels: string[]; series: XYSeries[] } {
  const n = Math.max(0, Math.floor(data.days));
  const egp = (k: Pctl) =>
    Array.from({ length: n }, (_, i) => {
      const m = finiteOrNull(data.percentiles[k]?.[i]);
      return m === null ? null : Math.round(data.initial_value * m);
    });
  const v = { p5: egp("p5"), p25: egp("p25"), p50: egp("p50"), p75: egp("p75"), p95: egp("p95") };
  // Hidden lines: in the readout (and the domain) but drawn as the bands.
  const hidden = (k: Pctl): LineSeries => ({ kind: "line", id: k, name: NAMES[k], values: v[k], color: CHART.accent, hidden: true });
  return {
    labels: Array.from({ length: n }, (_, i) => String(i + 1)),
    series: [
      { kind: "band", id: "outer", lower: v.p5, upper: v.p95, fill: withAlpha(CHART.accent, 0.08) },
      { kind: "band", id: "inner", lower: v.p25, upper: v.p75, fill: withAlpha(CHART.accent, 0.12) },
      hidden("p95"),
      hidden("p75"),
      { kind: "line", id: "p50", name: NAMES.p50, values: v.p50, color: CHART.accent, width: 2 },
      hidden("p25"),
      hidden("p5"),
    ],
  };
}

const dayTitle = (label: string) => `Day ${label}`;
const egpReadout = (v: number) => `${v.toLocaleString("en-US")} EGP`;

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View className="w-[48%] rounded-lg bg-white/[0.03] p-3">
      <AppText className="text-[10px] text-white/40">{label}</AppText>
      <AppText className={`font-mono-semibold text-sm ${tone}`}>{value}</AppText>
    </View>
  );
}

export function MonteCarloChart({ data }: MonteCarloChartProps) {
  const { labels, series } = useMemo(() => monteCarloSeries(data), [data]);
  const { days, probability_of_loss } = data;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
      <AppText className="mb-4 font-sans-semibold text-lg text-white">Monte Carlo Simulation</AppText>
      <AppText className="mb-4 text-xs text-white/40">
        1,000 simulated scenarios over {days} days based on your portfolio&apos;s historical behavior.
      </AppText>

      <XYChart
        testID="monte-carlo-chart"
        labels={labels}
        series={series}
        height={250}
        yAxisWidth={55}
        yTickFormat={formatCompact}
        readoutTitle={dayTitle}
        readoutFormat={egpReadout}
      />
      <AppText className="mt-1 text-center text-[10px] text-white/30">Days</AppText>

      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
        <Tile
          label="Chance of Loss"
          value={`${(probability_of_loss * 100).toFixed(0)}%`}
          tone={lossChanceToneClass(probability_of_loss)}
        />
        <Tile label="Worst Case (5%)" value={formatOutcome(data.worst_case_5pct)} tone={outcomeToneClass(data.worst_case_5pct)} />
        <Tile label="Median Outcome" value={formatOutcome(data.median)} tone={outcomeToneClass(data.median)} />
        <Tile label="Best Case (95%)" value={formatOutcome(data.best_case_95pct)} tone={outcomeToneClass(data.best_case_95pct)} />
      </View>
    </View>
  );
}
