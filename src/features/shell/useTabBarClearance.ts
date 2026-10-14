import { BottomTabBarHeightContext } from "expo-router/tabs";
import { useContext } from "react";

/**
 * How far the floating pill tab bar reaches up from the bottom of a tab
 * screen (0 outside the tabs). The pill floats OVER the content, as on the
 * web, so a tab screen's scroll content must end with this much extra room or
 * its last row could never be scrolled clear of the pill.
 */
export function useTabBarClearance(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
