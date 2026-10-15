import { useState } from "react";
import { Pressable } from "react-native";
import { useMarket } from "@/providers/market";
import { AppText, Sheet } from "@/ui";

const EXPLANATION =
  "US scores use bands calibrated on the Egyptian market. They will be recalibrated for US stocks.";

/**
 * Marks a score whose bands were not fitted on this market. Renders nothing on
 * a calibrated market; tapping it explains why the score is preliminary.
 */
export function PreliminaryTag({ compact = false }: { compact?: boolean }) {
  const { market } = useMarket();
  const [open, setOpen] = useState(false);
  if (market.score_calibrated) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preliminary score"
        accessibilityHint="Explains why this score is preliminary"
        onPress={() => setOpen(true)}
        hitSlop={compact ? 10 : 6}
        className={`self-center rounded-full border border-white/15 bg-white/5 active:opacity-70 ${compact ? "px-1.5" : "px-2 py-0.5"}`}
      >
        <AppText className={`font-sans-medium text-white/60 ${compact ? "text-[8px] tracking-wider" : "text-[10px]"}`}>
          {compact ? "PRELIM" : "Preliminary"}
        </AppText>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <AppText className="mb-1 font-mono-semibold text-xs text-accent">Preliminary score</AppText>
        <AppText className="leading-5 text-white/70">{EXPLANATION}</AppText>
      </Sheet>
    </>
  );
}
