import { useState } from "react";
import { Pressable, View } from "react-native";
import { scoreColor } from "@/charts";
import { useMarket } from "@/providers/market";
import type { Market } from "@/shared/markets";
import type { CompositeScore } from "@/shared/types";
import { AppText, IconButton } from "@/ui";
import { pct } from "./logic/format";
import { ScoreWeightsSheet } from "./ScoreWeightsSheet";

const CATEGORY_LABELS: Record<string, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volume: "Volume",
  volatility: "Volatility",
  divergence: "Divergence",
  quality: "Quality",
  risk_adjusted: "Risk-Adjusted",
  relative_strength: "Rel. Strength",
};
const CATEGORY_ORDER = ["trend", "momentum", "volume", "volatility", "divergence", "quality", "risk_adjusted", "relative_strength"] as const;
const UNSCORED = "#4a4a5a";

/** Port of web `ScoreBreakdown`, including its measured-finding disclaimer. */
export function ScoreBreakdown({
  composite,
  onWeightsChanged,
  market: scoreMarket,
}: {
  composite: CompositeScore;
  onWeightsChanged?: () => void;
  /** The market the score belongs to; omitted, the app's. */
  market?: Market;
}) {
  const { market: appMarket } = useMarket();
  const m = scoreMarket ?? appMarket;
  // Each market's backtest (2007–2026 for both EG and US) found the same thing:
  // higher scores did not precede better returns. A market without its own
  // backtest is told the EGX evidence, never a claim nobody measured.
  const tested = m.code === "EG" || !m.score_calibrated ? "the EGX" : `${m.short_name} stocks`;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <AppText className="font-mono-semibold text-sm text-white">Score Breakdown</AppText>
          <AppText className="text-[11px] text-white/40">8 categories blended with your weights</AppText>
        </View>
        <IconButton icon="settings-outline" accessibilityLabel="Adjust weights" onPress={() => setSettingsOpen(true)} />
      </View>

      <View className="gap-2">
        {CATEGORY_ORDER.map((name) => {
          const c = composite.categories[name];
          if (!c) return null;
          const score = c.score;
          const isOpen = expanded === name;
          const color = score !== null ? scoreColor(score) : UNSCORED;
          const barPct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setExpanded(isOpen ? null : name)}
              className="min-h-[44px] rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row flex-wrap items-baseline gap-2">
                  <AppText className="font-sans-medium text-xs text-white/90">{CATEGORY_LABELS[name]}</AppText>
                  {/* The weight it ACTUALLY carried — an excluded category's
                      weight is redistributed, so the configured one would not
                      reconcile with the gauge. */}
                  {score !== null ? (
                    <AppText className="text-xs text-white/40">{`${(c.effective_weight ?? c.weight).toFixed(0)}% weight`}</AppText>
                  ) : (
                    <AppText className="text-xs italic text-white/30">excluded — not enough data</AppText>
                  )}
                </View>
                <AppText className="font-mono-semibold text-xs" style={{ color }}>
                  {score !== null ? score.toFixed(0) : "—"}
                </AppText>
              </View>
              <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <View className="h-full rounded-full" style={{ width: pct(barPct), backgroundColor: color }} />
              </View>
              {isOpen && c.reasons.length > 0 && (
                <View className="mt-3 gap-1.5">
                  {c.reasons.map((reason, i) => (
                    <AppText key={i} className="text-[11px] leading-relaxed text-white/60">{`• ${reason}`}</AppText>
                  ))}
                </View>
              )}
              {isOpen && c.reasons.length === 0 && (
                <AppText className="mt-2 text-[11px] italic text-white/40">No notable signals in this category.</AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      {composite.macro_adjustment != null && composite.macro_adjustment !== 0 && (
        <View className="mt-3 flex-row items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <AppText className="text-[11px] text-white/70">
            {`Macro adjustment: ${composite.macro_adjustment > 0 ? "+" : ""}${composite.macro_adjustment.toFixed(1)}`}
          </AppText>
          {composite.macro_context && (
            <AppText numberOfLines={1} className="flex-1 text-right text-[11px] text-white/40">
              {composite.macro_context}
            </AppText>
          )}
        </View>
      )}

      <AppText className="mt-4 text-[10px] leading-relaxed text-white/30">
        This score describes a stock&apos;s current technical condition. It is not a forecast: tested across {tested} from 2007–2026, higher scores did not precede better returns than lower ones. Read the categories above for what is true today, and consider fundamentals, news and macro before trading.
      </AppText>

      <ScoreWeightsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={onWeightsChanged} />
    </View>
  );
}
