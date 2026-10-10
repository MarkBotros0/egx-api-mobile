import { BottomTabBarHeightContext } from "expo-router/tabs";
import { useContext } from "react";
import { Pressable } from "react-native";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/ui";
import { FAB_SIZE, fabBottomOffset } from "./logic/layout";

/**
 * style.bottom for the FAB. The context form of the tab-bar height is used
 * (not useBottomTabBarHeight) because the hook throws outside a navigator.
 * Until the scene has been measured, assume it reaches the window bottom —
 * the worst case, so the FAB can only start too high, never under the bar.
 */
export function useFabBottom(sceneBottom: number | null): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  return fabBottomOffset({
    windowHeight: frame.height,
    sceneBottom: sceneBottom ?? frame.height,
    tabBarHeight,
    insetBottom: insets.bottom,
  });
}

export function AddFab({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a stock"
      onPress={onPress}
      style={{ position: "absolute", right: 16, bottom, width: FAB_SIZE, height: FAB_SIZE }}
      className="items-center justify-center rounded-full bg-accent shadow-lg active:opacity-80"
    >
      <AppText className="font-sans-bold text-2xl text-charcoal-dark">+</AppText>
    </Pressable>
  );
}
