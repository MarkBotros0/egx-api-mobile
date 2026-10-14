import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, LearnTerm, Pill, PillRow, Sheet, RowLabel } from "@/ui";
import {
  BAR_COUNTS,
  INTERVALS,
  OVERLAYS,
  overlayExplanation,
  type BarCount,
  type ChartInterval,
  type OverlayKey,
  type OverlayState,
} from "./logic/stockDetail";

const INTERVAL_EXPLANATION =
  "Changes the bar size, and with it every indicator and the composite score. A Daily RSI reads the last ~2 weeks of momentum; a Weekly RSI reads ~3 months. Both are valid — they answer different questions. Use Daily for timing an entry or exit, and Weekly or Monthly to check the bigger trend you're trading with or against. When they disagree, the longer timeframe sets the context and the shorter one sets the timing. Monthly has the least history to work with (a 200-month average needs 16 years), so some categories score from fewer inputs there.";
const HISTORY_EXPLANATION =
  "How many bars of history to load. It sets how far back every chart on this page goes, and the cumulative return in Key Statistics is measured over exactly this window. Indicators are always computed on a longer internal window, so a short setting here never makes SMA 200 or the composite score less accurate.";
const OVERLAYS_EXPLANATION =
  "Lines drawn on the price chart only. Turning one on or off changes nothing else on this page — not the composite score, not the statistics. Use them to see what the indicators behind the score actually look like against price.";

/** Interval + history: both refetch, and both change the score — they sit together. */
export function IntervalBarsControls({
  interval,
  bars,
  onInterval,
  onBars,
}: {
  interval: ChartInterval;
  bars: BarCount;
  onInterval: (v: ChartInterval) => void;
  onBars: (v: BarCount) => void;
}) {
  return (
    <View className="gap-2">
      <View>
        <PillRow
          label={
            <LearnTerm term="Chart interval" explanation={INTERVAL_EXPLANATION}>
              <RowLabel>Interval</RowLabel>
            </LearnTerm>
          }
        >
          {INTERVALS.map((iv) => (
            <Pill key={iv} label={iv} active={interval === iv} onPress={() => onInterval(iv)} />
          ))}
        </PillRow>
      </View>
      <View>
        <PillRow
          label={
            <LearnTerm term="History" explanation={HISTORY_EXPLANATION}>
              <RowLabel>History</RowLabel>
            </LearnTerm>
          }
        >
          {BAR_COUNTS.map((b) => (
            <Pill key={b} label={String(b)} active={bars === b} onPress={() => onBars(b)} />
          ))}
        </PillRow>
      </View>
    </View>
  );
}

/** Chart-only overlays, attached to the chart they draw on. Long-press explains one. */
export function OverlayToggles({ value, onToggle }: { value: OverlayState; onToggle: (k: OverlayKey) => void }) {
  const [explain, setExplain] = useState<{ term: string; text: string } | null>(null);
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <LearnTerm term="Chart overlays" explanation={OVERLAYS_EXPLANATION}>
          <RowLabel>Overlays</RowLabel>
        </LearnTerm>
        <AppText className="text-[10px] text-white/30">Long-press one to learn what it draws</AppText>
      </View>
      <PillRow>
        {OVERLAYS.map((o) => {
          const on = value[o.key];
          return (
            <Pressable
              key={o.key}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.label} overlay`}
              onPress={() => onToggle(o.key)}
              onLongPress={() => setExplain({ term: o.label, text: overlayExplanation(o.key, o.label) })}
              className={`min-h-[44px] flex-row items-center gap-1.5 rounded-full px-3 ${on ? "bg-white/10" : ""}`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color, opacity: on ? 1 : 0.3 }} />
              <AppText
                className={`font-sans-medium text-[11px] ${on ? "" : "text-white/30"}`}
                style={on ? { color: o.color } : undefined}
              >
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </PillRow>
      <Sheet visible={explain !== null} onClose={() => setExplain(null)} title={explain?.term}>
        <AppText className="text-sm leading-relaxed text-white/70">{explain?.text}</AppText>
      </Sheet>
    </View>
  );
}
