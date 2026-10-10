import { useMemo, useState } from "react";
import { View } from "react-native";

import { AppText, LearnTerm, Pill } from "@/ui";

import { formatCompact } from "./kit/format";
import { CHART, withAlpha } from "./kit/palette";
import { XYChart } from "./kit/XYChart";
import type { RefLine, XYSeries } from "./kit/xyModel";

export interface IndicatorDataPoint {
  date: string;
  rsi?: number | null;
  macd_line?: number | null;
  macd_signal?: number | null;
  macd_histogram?: number | null;
  stochastic_k?: number | null;
  stochastic_d?: number | null;
  obv?: number | null;
}

export interface IndicatorPanelProps {
  data: IndicatorDataPoint[];
}

const TABS = ["RSI", "MACD", "Stochastic", "OBV"] as const;
type Tab = (typeof TABS)[number];

const SIGNAL_ORANGE = "#ff8800";
const OBV_CYAN = "#00ccff";
const CHART_HEIGHT = 150;
const PCT_DOMAIN = { min: 0, max: 100 };
const RSI_TICKS = [0, 30, 50, 70, 100];
const STOCH_TICKS = [0, 20, 50, 80, 100];
const OVERBOUGHT = withAlpha(CHART.loss, 0.3);
const OVERSOLD = withAlpha(CHART.gain, 0.3);
const RSI_REFS: RefLine[] = [
  { id: "overbought", y: 70, color: OVERBOUGHT, dash: "3 3" },
  { id: "oversold", y: 30, color: OVERSOLD, dash: "3 3" },
];
const STOCH_REFS: RefLine[] = [
  { id: "overbought", y: 80, color: OVERBOUGHT, dash: "3 3" },
  { id: "oversold", y: 20, color: OVERSOLD, dash: "3 3" },
];
const ZERO_REF: RefLine[] = [
  { id: "zero", y: 0, color: "rgba(255,255,255,0.1)" },
];
const HIST_UP = withAlpha(CHART.gain, 0.4);
const HIST_DOWN = withAlpha(CHART.loss, 0.4);

const fixed1 = (v: number) => v.toFixed(1);
const fixed3 = (v: number) => v.toFixed(3);
const grouped = (v: number) => v.toLocaleString();

function Header({
  term,
  explanation,
  label,
}: {
  term: string;
  explanation: string;
  label: string;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-2">
      <LearnTerm term={term} explanation={explanation}>
        {label}
      </LearnTerm>
    </View>
  );
}

function ZoneFooter({ low, high }: { low: string; high: string }) {
  return (
    <View className="mt-1 flex-row justify-between px-8">
      <AppText className="text-[10px] text-white/30">{low}</AppText>
      <AppText className="text-[10px] text-white/30">{high}</AppText>
    </View>
  );
}

function useDates(data: readonly IndicatorDataPoint[]) {
  return useMemo(() => data.map((d) => d.date), [data]);
}

function RSIChart({ data }: IndicatorPanelProps) {
  const labels = useDates(data);
  const series = useMemo<XYSeries[]>(
    () => [
      {
        kind: "line",
        id: "rsi",
        name: "RSI",
        values: data.map((d) => d.rsi),
        color: CHART.accent,
        width: 1.5,
        connectNulls: true,
      },
    ],
    [data],
  );
  return (
    <View>
      <Header
        term="RSI — Relative Strength Index"
        explanation="Measures momentum on a 0-100 scale. Above 70 = overbought (may drop soon). Below 30 = oversold (may bounce). It helps you avoid buying at peaks or selling at bottoms."
        label="RSI (14)"
      />
      <XYChart
        testID="rsi-chart"
        labels={labels}
        series={series}
        height={CHART_HEIGHT}
        yDomain={PCT_DOMAIN}
        yTicks={RSI_TICKS}
        refLines={RSI_REFS}
        yAxisWidth={30}
        readoutFormat={fixed1}
      />
      <ZoneFooter low="Oversold (<30)" high="Overbought (>70)" />
    </View>
  );
}

function MACDChart({ data }: IndicatorPanelProps) {
  const labels = useDates(data);
  const series = useMemo<XYSeries[]>(
    () => [
      {
        kind: "bars",
        id: "macd_histogram",
        name: "Histogram",
        values: data.map((d) => d.macd_histogram),
        colorAt: (v) => (v >= 0 ? HIST_UP : HIST_DOWN),
      },
      {
        kind: "line",
        id: "macd_line",
        name: "MACD",
        values: data.map((d) => d.macd_line),
        color: CHART.accent,
        width: 1.5,
        connectNulls: true,
      },
      {
        kind: "line",
        id: "macd_signal",
        name: "Signal",
        values: data.map((d) => d.macd_signal),
        color: SIGNAL_ORANGE,
        width: 1,
        dash: "4 2",
        connectNulls: true,
      },
    ],
    [data],
  );
  return (
    <View>
      <Header
        term="MACD — Moving Average Convergence Divergence"
        explanation="Shows the relationship between two moving averages. When the MACD line crosses above the Signal line = bullish (buy signal). When it crosses below = bearish (sell signal). The histogram shows momentum strength."
        label="MACD (12, 26, 9)"
      />
      <XYChart
        testID="macd-chart"
        labels={labels}
        series={series}
        height={CHART_HEIGHT}
        refLines={ZERO_REF}
        yAxisWidth={40}
        readoutFormat={fixed3}
      />
    </View>
  );
}

function StochasticChart({ data }: IndicatorPanelProps) {
  const labels = useDates(data);
  const series = useMemo<XYSeries[]>(
    () => [
      {
        kind: "line",
        id: "stochastic_k",
        name: "%K",
        values: data.map((d) => d.stochastic_k),
        color: CHART.accent,
        width: 1.5,
        connectNulls: true,
      },
      {
        kind: "line",
        id: "stochastic_d",
        name: "%D",
        values: data.map((d) => d.stochastic_d),
        color: SIGNAL_ORANGE,
        width: 1,
        dash: "4 2",
        connectNulls: true,
      },
    ],
    [data],
  );
  return (
    <View>
      <Header
        term="Stochastic Oscillator"
        explanation="Compares a stock's closing price to its price range over 14 days. Above 80 = overbought, below 20 = oversold. When %K crosses above %D from below 20, it's a buy signal."
        label="Stochastic (14, 3)"
      />
      <XYChart
        testID="stochastic-chart"
        labels={labels}
        series={series}
        height={CHART_HEIGHT}
        yDomain={PCT_DOMAIN}
        yTicks={STOCH_TICKS}
        refLines={STOCH_REFS}
        yAxisWidth={30}
        readoutFormat={fixed1}
      />
      <ZoneFooter low="Oversold (<20)" high="Overbought (>80)" />
    </View>
  );
}

function OBVChart({ data }: IndicatorPanelProps) {
  const labels = useDates(data);
  const series = useMemo<XYSeries[]>(
    () => [
      {
        kind: "line",
        id: "obv",
        name: "OBV",
        values: data.map((d) => d.obv),
        color: OBV_CYAN,
        width: 1.5,
        connectNulls: true,
      },
    ],
    [data],
  );
  return (
    <View>
      <Header
        term="OBV — On-Balance Volume"
        explanation="Adds volume on up days and subtracts on down days. Rising OBV confirms a price uptrend. Falling OBV during a price rise = warning (divergence)."
        label="OBV"
      />
      <XYChart
        testID="obv-chart"
        labels={labels}
        series={series}
        height={CHART_HEIGHT}
        yAxisWidth={50}
        yTickFormat={formatCompact}
        readoutFormat={grouped}
      />
    </View>
  );
}

export function IndicatorPanel({ data }: IndicatorPanelProps) {
  const [tab, setTab] = useState<Tab>("RSI");
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-4 flex-row flex-wrap gap-2">
        {TABS.map((t) => (
          <Pill
            key={t}
            label={t}
            active={tab === t}
            tone="accent"
            onPress={() => setTab(t)}
          />
        ))}
      </View>
      {tab === "RSI" ? <RSIChart data={data} /> : null}
      {tab === "MACD" ? <MACDChart data={data} /> : null}
      {tab === "Stochastic" ? <StochasticChart data={data} /> : null}
      {tab === "OBV" ? <OBVChart data={data} /> : null}
    </View>
  );
}
