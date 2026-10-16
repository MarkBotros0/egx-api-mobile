import { useEffect, type RefObject } from "react";
import { useNavigation } from "expo-router";

type Scrollable = { scrollToOffset: (p: { offset: number; animated?: boolean }) => void };

/**
 * Tapping the tab you are already on scrolls its list back to the top — the
 * iOS convention. `PillTabBar` emits `tabPress` on every tap; it only reaches
 * the screen of the tapped tab, and `isFocused()` is true only when that tab
 * was already open (a tap from another tab just switches to it).
 */
export function useScrollToTopOnTabPress(ref: RefObject<Scrollable | null>): void {
  const navigation = useNavigation();
  useEffect(() => {
    if (!navigation?.addListener) return;
    // `tabPress` is a bottom-tab event the generic navigation type does not list.
    const on = navigation.addListener as unknown as (e: string, cb: () => void) => () => void;
    return on("tabPress", () => {
      if (navigation.isFocused()) ref.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [navigation, ref]);
}
