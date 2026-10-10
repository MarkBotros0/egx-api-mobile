import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function TestSafeArea({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}
