import type { ReactNode } from "react";
import { Pressable, ScrollView } from "react-native";

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

export function Pill({ label, active = false, onPress, tone = "accent" }: { label: string; active?: boolean; onPress?: () => void; tone?: Tone }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      // Visual height mirrors the web; hitSlop makes the touch target 44pt (36 + 4 + 4).
      hitSlop={{ top: 4, bottom: 4 }}
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-[36px] justify-center rounded-full border px-3 ${active ? ACTIVE[tone] : "border-white/10 bg-white/5"}`}
    >
      <AppText className={`font-sans-medium text-xs ${active ? TEXT[tone] : "text-white/60"}`}>{label}</AppText>
    </Pressable>
  );
}

export function PillRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
      {children}
    </ScrollView>
  );
}
