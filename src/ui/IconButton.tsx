import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { COLORS } from "@/shared/theme";

import type { IoniconName } from "./types";

interface Props {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "default" | "danger";
}

export function IconButton({ icon, onPress, accessibilityLabel, tone = "default" }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
    >
      <Ionicons name={icon} size={22} color={tone === "danger" ? COLORS.loss : "rgba(255,255,255,0.8)"} />
    </Pressable>
  );
}
