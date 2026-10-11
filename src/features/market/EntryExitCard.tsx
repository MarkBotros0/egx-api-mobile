import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import type { EntryExit, ZoneConfidence } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { zoneTone } from "./logic/levels";

function ZoneBlock({
  kind,
  confidence,
  priceRange,
  suggestedStopLoss,
  reasons,
}: {
  kind: "entry" | "exit";
  confidence: ZoneConfidence | null;
  priceRange: { low: number; high: number } | null;
  suggestedStopLoss: number | null;
  reasons: string[];
}) {
  const tone = zoneTone(kind, confidence);
  const isEntry = kind === "entry";
  return (
    <View className={`rounded-lg border px-3 py-3 ${tone.boxClass}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <AppText className={`font-mono-semibold text-lg ${tone.textClass}`}>{isEntry ? "$" : "!"}</AppText>
          <View className="flex-1">
            <AppText className="text-[11px] uppercase tracking-wider text-white/50">{isEntry ? "Entry Zone" : "Exit Zone"}</AppText>
            {priceRange && (
              <AppText className={`font-mono-semibold text-sm ${tone.textClass}`}>
                {`${priceRange.low.toFixed(2)} – ${priceRange.high.toFixed(2)} EGP`}
              </AppText>
            )}
          </View>
        </View>
        {tone.badge && (
          <View className={`rounded-full border px-2 py-0.5 ${tone.badge.boxClass}`}>
            <AppText className={`font-sans-medium text-[10px] ${tone.badge.textClass}`}>{tone.badge.label}</AppText>
          </View>
        )}
      </View>
      {suggestedStopLoss != null && (
        <View className="mt-2 flex-row items-center justify-between border-t border-white/5 pt-2">
          <AppText className="text-[11px] text-white/50">Suggested stop-loss</AppText>
          <AppText className="font-mono text-xs text-white/80">{`${suggestedStopLoss.toFixed(2)} EGP`}</AppText>
        </View>
      )}
      {reasons.length > 0 && (
        <View className="mt-2 gap-0.5">
          {reasons.map((r, i) => (
            <AppText key={i} className="text-[11px] leading-relaxed text-white/60">{`• ${r}`}</AppText>
          ))}
        </View>
      )}
    </View>
  );
}

/** Port of web `EntryExitCard`. */
export function EntryExitCard({ entryExit }: { entryExit: EntryExit | null | undefined }) {
  if (!entryExit) return null;
  const { entry_zone, exit_zone } = entryExit;
  const anyActive = entry_zone.active || exit_zone.active;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Entry / Exit Zones"
          explanation="Entry zones combine a tested support level with non-overbought momentum — a beginner-friendly way to time a buy. Exit zones combine resistance with overbought momentum — a cue to trim or tighten your stop-loss."
        >
          Entry / Exit Zones
        </LearnTerm>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("entry_exit_zones"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn more →</AppText>
        </Pressable>
      </View>

      {!anyActive ? (
        <View className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4">
          <AppText className="text-center text-xs text-white/50">
            No active entry or exit zone right now — price is sitting between support and resistance without momentum confirmation either way.
          </AppText>
        </View>
      ) : (
        <View className="gap-3">
          {entry_zone.active && (
            <ZoneBlock
              kind="entry"
              confidence={entry_zone.confidence}
              priceRange={entry_zone.price_range}
              suggestedStopLoss={entry_zone.suggested_stop_loss}
              reasons={entry_zone.reasons}
            />
          )}
          {exit_zone.active && (
            <ZoneBlock
              kind="exit"
              confidence={exit_zone.confidence}
              priceRange={exit_zone.price_range}
              suggestedStopLoss={null}
              reasons={exit_zone.reasons}
            />
          )}
        </View>
      )}
    </View>
  );
}
