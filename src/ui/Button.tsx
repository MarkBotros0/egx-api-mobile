import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, View } from "react-native";

import { COLORS } from "@/shared/theme";

import { AppText } from "./AppText";
import type { IoniconName } from "./types";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const CONTAINER: Record<Variant, string> = {
  primary: "bg-accent",
  secondary: "border border-white/10 bg-white/5",
  danger: "border border-loss/30 bg-loss/10",
  ghost: "bg-transparent",
};
const LABEL: Record<Variant, string> = {
  primary: "text-charcoal-dark",
  secondary: "text-white",
  danger: "text-loss",
  ghost: "text-accent",
};
const ICON: Record<Variant, string> = {
  primary: COLORS["charcoal-dark"],
  secondary: "#ffffff",
  danger: COLORS.loss,
  ghost: COLORS.accent,
};

// text-sm in font-sans-semibold.
const LABEL_FONT = { fontFamily: "Outfit_600SemiBold", fontSize: 14, lineHeight: 20 } as const;

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconName;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = "primary", disabled, loading, icon, accessibilityLabel }: Props) {
  const inert = !!disabled || !!loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert, busy: !!loading }}
      disabled={inert}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center justify-center rounded-lg px-4 ${CONTAINER[variant]} ${inert ? "opacity-50" : "active:opacity-80"}`}
    >
      {loading ? (
        <ActivityIndicator color={ICON[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Ionicons name={icon} size={18} color={ICON[variant]} /> : null}
          {/* Font and size go in style, not className: inside this Pressable the
              className text styles land after Android has measured the label
              in the default font, so a long label wrapped and lost its last word. */}
          <AppText style={LABEL_FONT} className={LABEL[variant]}>{label}</AppText>
        </View>
      )}
    </Pressable>
  );
}
