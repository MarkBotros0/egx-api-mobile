import { View } from "react-native";
import type { KeyLevels, NearestLevel } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { levelReading } from "./logic/levels";

function LevelRow({ kind, level, currentPrice }: { kind: "support" | "resistance"; level: NearestLevel | null; currentPrice: number }) {
  const label = kind === "support" ? "Nearest Support" : "Nearest Resistance";
  if (!level) {
    return (
      <View className="flex-row items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <AppText className="text-[11px] uppercase tracking-wider text-white/40">{label}</AppText>
        <AppText className="text-xs text-white/30">—</AppText>
      </View>
    );
  }
  const r = levelReading(kind, level, currentPrice);
  return (
    <View
      className={`gap-1 rounded-lg border px-3 py-2 ${r.brokenThrough ? "border-yellow-400/20 bg-yellow-400/[0.04]" : "border-white/5 bg-white/[0.02]"}`}
    >
      <AppText className="text-[11px] uppercase tracking-wider text-white/40">{r.label}</AppText>
      <AppText className={`font-mono-semibold text-sm ${kind === "support" ? "text-gain" : "text-loss"}`}>{r.priceText}</AppText>
      <AppText className="text-[10px] text-white/40">{r.strengthText}</AppText>
      <AppText className="font-mono text-xs text-white/60">{r.directionText}</AppText>
    </View>
  );
}

/** Port of web `KeyLevelsCard`. */
export function KeyLevelsCard({ keyLevels }: { keyLevels: KeyLevels | null | undefined }) {
  if (!keyLevels) return null;
  const { current_price, nearest_support, nearest_resistance } = keyLevels;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Key Levels"
          explanation="Support and resistance are price zones where the stock has previously bounced (support) or stalled (resistance). Two caveats worth knowing: a level marked 'touched once' is a single bounce, not a proven floor; and levels need about a month of trading either side of them to be detected, so anything formed in the last few weeks will not appear here yet. Use them as reference points, not guarantees."
        >
          Key Levels
        </LearnTerm>
        <AppText className="font-mono text-[10px] text-white/30">{`${current_price.toFixed(2)} EGP`}</AppText>
      </View>

      <View className="gap-3">
        {keyLevels.clear_air_above ? (
          // With nothing overhead the fallback "resistance" is a level the
          // stock cleared long ago; the headline is that there is no ceiling.
          <View className="rounded-lg border border-gain/20 bg-gain/[0.05] px-3 py-2.5">
            <AppText className="text-[11px] uppercase tracking-wider text-white/40">Overhead</AppText>
            <AppText className="font-mono-semibold text-sm text-gain">No resistance above</AppText>
            <AppText className="mt-1 text-[10px] leading-relaxed text-white/40">
              Trading above every level in its recent history — no prior ceiling. Also means there is no chart-based target above, so set one from your own plan and trail your stop up.
            </AppText>
          </View>
        ) : (
          <LevelRow kind="resistance" level={nearest_resistance} currentPrice={current_price} />
        )}

        <View className="flex-row items-center gap-2">
          <View className="h-px flex-1 border-t border-dashed border-white/10" />
          <AppText className="font-mono text-[10px] text-white/50">{current_price.toFixed(2)}</AppText>
          <View className="h-px flex-1 border-t border-dashed border-white/10" />
        </View>

        <LevelRow kind="support" level={nearest_support} currentPrice={current_price} />
      </View>
    </View>
  );
}
