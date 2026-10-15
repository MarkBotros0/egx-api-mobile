import { View } from "react-native";
import { CompositeGauge, scoreColor } from "@/charts";
import type { CompositeScore } from "@/shared/types";
import { AppText } from "@/ui";
import type { Callout, CalloutTone, ChartInterval } from "./logic/stockDetail";
import { PreliminaryTag } from "./PreliminaryTag";
import { ScoreBreakdown } from "./ScoreBreakdown";

const CALLOUT_BOX: Record<CalloutTone, string> = {
  gain: "bg-gain/10",
  loss: "bg-loss/10",
  accent: "bg-accent/10",
  neutral: "bg-white/5",
};
const CALLOUT_TEXT: Record<CalloutTone, string> = {
  gain: "text-gain",
  loss: "text-loss",
  accent: "text-accent",
  neutral: "text-white/60",
};

/**
 * Gauge + condition word + breakdown + callout pills. "Technical Condition",
 * not "Signal": the score cannot rank stocks, so the label names what it
 * measures. The interval is stated on the score itself.
 */
export function CompositeCard({
  composite,
  interval,
  callouts,
}: {
  composite: CompositeScore;
  interval: ChartInterval;
  callouts: Callout[];
}) {
  return (
    <View className="gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <View className="items-center gap-1">
        <CompositeGauge score={composite.score} signal={composite.signal} size="lg" />
        <AppText className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Technical Condition</AppText>
        <View className="flex-row items-center gap-2">
          <AppText className="font-mono-semibold text-base" style={{ color: scoreColor(composite.score) }}>
            {composite.signal}
          </AppText>
          <PreliminaryTag />
        </View>
        <AppText className="text-[10px] text-white/30">{`on ${interval.toLowerCase()} bars`}</AppText>
        {interval !== "Daily" && (
          <AppText className="text-[10px] text-white/25">Daily is the primary view for timing</AppText>
        )}
      </View>

      <ScoreBreakdown composite={composite} />

      {callouts.length > 0 && (
        <View className="flex-row flex-wrap gap-2 border-t border-white/5 pt-4">
          {callouts.map((c) => (
            <View key={c.key} className={`rounded-full px-2.5 py-1 ${CALLOUT_BOX[c.tone]}`}>
              <AppText className={`text-[11px] ${CALLOUT_TEXT[c.tone]}`}>{c.label}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
