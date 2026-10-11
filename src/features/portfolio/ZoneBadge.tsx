import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { learnHref } from "@/lib/links";
import type { EntryExit } from "@/shared/types";
import { AppText, Pill } from "@/ui";
import { isStrongZone } from "@/lib/zones";
import { zoneLabel, zonePill, zoneTone } from "@/features/portfolio/logic/zones";

export function ZoneBadge({ entryExit }: { entryExit: EntryExit | null | undefined }) {
  const pill = zonePill(entryExit);
  if (!pill) return null;
  return <Pill label={zoneLabel(pill)} tone={zoneTone(pill)} />;
}

const range = (r: { low: number; high: number }) => `${r.low.toFixed(2)} – ${r.high.toFixed(2)}`;

export function ZoneDetail({ entryExit }: { entryExit: EntryExit | null | undefined }) {
  if (!entryExit) return null;
  const { entry_zone: entry, exit_zone: exit } = entryExit;
  if (!entry.active && !exit.active) return null;
  const entryStrong = isStrongZone(entry.confidence);
  const exitStrong = isStrongZone(exit.confidence);

  return (
    <View className="mt-3 gap-2 border-t border-white/5 pt-3">
      {entry.active && entry.price_range && (
        <View className={`rounded-lg border px-3 py-2 ${entryStrong ? "border-gain/20 bg-gain/5" : "border-white/10 bg-white/5"}`}>
          <View className="flex-row items-center justify-between">
            <AppText className="font-sans text-[10px] uppercase tracking-wider text-white/50">
              Entry zone ({entry.confidence ?? "—"})
            </AppText>
            <AppText className={`font-mono-semibold text-xs ${entryStrong ? "text-gain" : "text-white/70"}`}>
              {range(entry.price_range)}
            </AppText>
          </View>
          {entry.suggested_stop_loss != null && (
            <View className="mt-1 flex-row items-center justify-between">
              <AppText className="font-sans text-[11px] text-white/50">Suggested stop-loss</AppText>
              <AppText className="font-mono text-[11px] text-white/80">{entry.suggested_stop_loss.toFixed(2)}</AppText>
            </View>
          )}
        </View>
      )}
      {exit.active && exit.price_range && (
        <View className={`rounded-lg border px-3 py-2 ${exitStrong ? "border-loss/20 bg-loss/5" : "border-white/10 bg-white/5"}`}>
          <View className="flex-row items-center justify-between">
            <AppText className="font-sans text-[10px] uppercase tracking-wider text-white/50">
              Exit zone ({exit.confidence ?? "—"})
            </AppText>
            <AppText className={`font-mono-semibold text-xs ${exitStrong ? "text-loss" : "text-white/70"}`}>
              {range(exit.price_range)}
            </AppText>
          </View>
        </View>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(learnHref("entry_exit_zones"))}
        className="min-h-[44px] justify-center"
      >
        <AppText className="font-sans text-[10px] text-accent">What does this mean? →</AppText>
      </Pressable>
    </View>
  );
}
