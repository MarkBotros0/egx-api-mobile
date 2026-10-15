import { useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";

import {
  AllocationBar,
  AllocationDonut,
  CompareChart,
  CompositeGauge,
  CorrelationHeatmap,
  IndicatorPanel,
  MonteCarloChart,
  PriceChart,
  Sparkline,
  VolumeChart,
  indicatorRows,
  priceRows,
  volumeRows,
  type PriceOverlays,
} from "@/charts";
import { EG_FALLBACK } from "@/shared/markets";
import { AppText, Pill, PillRow, Screen } from "@/ui";

import {
  allocationFixture,
  analysisFixture,
  compareFixture,
  compareSeries,
  correlationFixture,
  monteCarloFixture,
} from "../__fixtures__";

const OVERLAY_TOGGLES: { key: keyof PriceOverlays; label: string }[] = [
  { key: "sma20", label: "SMA 20" },
  { key: "sma50", label: "SMA 50" },
  { key: "sma200", label: "SMA 200" },
  { key: "ema12", label: "EMA 12" },
  { key: "ema26", label: "EMA 26" },
  { key: "bollinger", label: "Bollinger" },
  { key: "trendlines", label: "Trendlines" },
];

const GAUGE_SCORES = [12, 20, 45, 72, 91, null] as const;
const SPARK_DOWN = [10, 9.8, 9.9, 9.5, 9.1, 9.3, 8.7, 8.9];
const SPARK_FLAT = [7, 7, 7, 7];
const NO_TRENDS = { support: null, resistance: null };
const ON_TRENDLINES: PriceOverlays = { trendlines: true };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-8 gap-3">
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <AppText variant="muted" className="text-xs">{children}</AppText>;
}

/** Dev-only: every chart, from deterministic fixtures, plus the edge cases. */
export function ChartGallery() {
  const price = useMemo(() => priceRows(analysisFixture), []);
  const volume = useMemo(() => volumeRows(analysisFixture), []);
  const indicators = useMemo(() => indicatorRows(analysisFixture), []);
  const compare = useMemo(() => compareSeries(compareFixture), []);
  const sparkUp = useMemo(() => analysisFixture.ohlcv.close.slice(-30), []);
  const singleBar = useMemo(() => price.slice(-1), [price]);
  const flatBars = useMemo(() => price.slice(-20).map((p) => ({ ...p, close: 40 })), [price]);
  const [overlays, setOverlays] = useState<PriceOverlays>({ sma20: true, sma50: true, bollinger: true, trendlines: true });
  const toggle = (key: keyof PriceOverlays) => setOverlays((o) => ({ ...o, [key]: !o[key] }));

  return (
    <Screen scroll>
      <AppText variant="title" className="mb-1">Chart gallery</AppText>
      <AppText variant="muted" className="mb-6">
        Dev only. Every chart from fixtures — drag across a chart for the crosshair, tap to pin or clear it.
      </AppText>

      <Section title="CompositeGauge">
        {(["sm", "md", "lg"] as const).map((size) => (
          <View key={size} className="flex-row flex-wrap items-end gap-3">
            {GAUGE_SCORES.map((score) => (
              <CompositeGauge
                key={`${size}-${score}`}
                score={score}
                signal={score === null ? null : score >= 80 ? "Very Strong" : score >= 60 ? "Strong" : score >= 40 ? "Neutral" : score >= 20 ? "Weak" : "Very Weak"}
                size={size}
              />
            ))}
          </View>
        ))}
        <Note>12 pulses (Strong Sell, below 20). 20 does not. The last gauge has no score.</Note>
      </Section>

      <Section title="Sparkline">
        <View className="flex-row items-center gap-4">
          <Sparkline values={sparkUp} />
          <Sparkline values={SPARK_DOWN} />
          <Sparkline values={SPARK_FLAT} />
          <Sparkline values={sparkUp} width={56} height={28} />
        </View>
        <Note>Up (64×32), down, flat, watchlist size (56×28). A single point renders nothing.</Note>
      </Section>

      <Section title="PriceChart">
        <PillRow>
          {OVERLAY_TOGGLES.map(({ key, label }) => (
            <Pill key={key} label={label} active={!!overlays[key]} onPress={() => toggle(key)} />
          ))}
        </PillRow>
        <PriceChart
          data={price}
          overlays={overlays}
          supports={analysisFixture.support_resistance.supports}
          resistances={analysisFixture.support_resistance.resistances}
          fibonacci={analysisFixture.fibonacci}
          trendlines={analysisFixture.trendlines}
          height={300}
        />
        <PriceChart data={price.slice(-60)} overlays={ON_TRENDLINES} trendlines={NO_TRENDS} height={200} />
        <Note>Second chart: trendlines on, none drawn — the caption must explain why.</Note>
      </Section>

      <Section title="VolumeChart">
        <VolumeChart data={volume} />
      </Section>

      <Section title="IndicatorPanel">
        <IndicatorPanel data={indicators} />
      </Section>

      <Section title="CompareChart">
        <CompareChart dates={compareFixture.dates} series={compare} height={280} />
        <CompareChart dates={[]} series={[]} height={120} />
      </Section>

      <Section title="MonteCarloChart">
        <MonteCarloChart data={monteCarloFixture} currency={EG_FALLBACK.currency} />
      </Section>

      <Section title="CorrelationHeatmap">
        <CorrelationHeatmap data={correlationFixture} />
      </Section>

      <Section title="AllocationBar / AllocationDonut">
        <AllocationBar allocation={allocationFixture} />
        <AllocationDonut allocation={allocationFixture} />
        <AllocationDonut allocation={{ Banks: 100 }} size={120} />
      </Section>

      <Section title="Edge cases">
        <PriceChart data={[]} height={120} />
        <Note>Single bar:</Note>
        <PriceChart data={singleBar} height={160} />
        <Note>All closes equal:</Note>
        <PriceChart data={flatBars} height={160} />
        <Note>Volume with no data renders nothing below this line.</Note>
        <VolumeChart data={[]} />
        <CorrelationHeatmap data={{ symbols: ["COMI"], matrix: [[1]] }} />
      </Section>
    </Screen>
  );
}
