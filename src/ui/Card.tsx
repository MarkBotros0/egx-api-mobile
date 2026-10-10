import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

export function Card({ children, className = "", onPress }: { children: ReactNode; className?: string; onPress?: () => void }) {
  const base = `rounded-xl border border-white/10 bg-charcoal p-4 ${className}`;
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`${base} active:opacity-80`}>
      {children}
    </Pressable>
  );
}
