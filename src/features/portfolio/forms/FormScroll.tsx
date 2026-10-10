import type { ReactNode } from "react";
import { View } from "react-native";

/** Sheet body layout. The Sheet already provides keyboard avoidance and scrolling. */
export function FormScroll({ children }: { children: ReactNode }) {
  return <View className="gap-4 pb-6">{children}</View>;
}
