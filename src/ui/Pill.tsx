import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "./AppText";

type Tone = "neutral" | "gain" | "loss" | "accent";

const ACTIVE: Record<Tone, string> = {
  neutral: "border-white/30 bg-white/15",
  gain: "border-gain/40 bg-gain/15",
  loss: "border-loss/40 bg-loss/15",
  accent: "border-accent/50 bg-accent/20",
};
const TEXT: Record<Tone, string> = {
  neutral: "text-white",
  gain: "text-gain",
  loss: "text-loss",
  accent: "text-accent",
};

/**
 * A chip. Like the web, a SELECTABLE chip has no outline until it is chosen
 * (a row of outlined capsules read as a wall of buttons); a static badge
 * (no onPress) and an on/off toggle (`outlined`) keep the outline.
 */
export function Pill({
  label,
  active = false,
  onPress,
  tone = "accent",
  outlined,
  accessibilityLabel,
}: {
  label: string;
  /** When the visible label leans on its row for meaning ("On" in the Score row). */
  accessibilityLabel?: string;
  active?: boolean;
  onPress?: () => void;
  tone?: Tone;
  outlined?: boolean;
}) {
  const outline = outlined ?? !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      // Visual height mirrors the web; hitSlop makes the touch target 44pt (36 + 4 + 4).
      hitSlop={{ top: 4, bottom: 4 }}
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-[36px] justify-center rounded-full border px-3.5 active:opacity-70 ${
        active ? ACTIVE[tone] : outline ? "border-white/10 bg-white/5" : "border-transparent"
      }`}
    >
      <AppText className={`font-sans-medium text-xs ${active ? TEXT[tone] : outline ? "text-white/60" : "text-white/45"}`}>{label}</AppText>
    </Pressable>
  );
}

/** A horizontally scrolling chip row, optionally led by a small uppercase
 *  label as on the web ("SORT", "FILTER"). */
export function PillRow({ children, label }: { children: ReactNode; label?: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2 py-1">
      {label ? <View className="pr-1">{typeof label === "string" ? <RowLabel>{label}</RowLabel> : label}</View> : null}
      {children}
    </ScrollView>
  );
}

export function RowLabel({ children }: { children: ReactNode }) {
  return <AppText className="font-sans-medium text-[10px] uppercase tracking-[1px] text-white/30">{children}</AppText>;
}
