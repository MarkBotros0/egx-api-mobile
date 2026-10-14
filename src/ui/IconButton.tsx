import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { COLORS } from "@/shared/theme";

import type { IoniconName } from "./types";

interface Props {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "default" | "danger" | "accent";
  /** Toggle state for a screen reader (e.g. Watch / Watching). */
  selected?: boolean;
}

export function IconButton({ icon, onPress, accessibilityLabel, tone = "default", selected }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
    >
      <Ionicons name={icon} size={22} color={tone === "danger" ? COLORS.loss : tone === "accent" ? COLORS.accent : "rgba(255,255,255,0.8)"} />
    </Pressable>
  );
}
