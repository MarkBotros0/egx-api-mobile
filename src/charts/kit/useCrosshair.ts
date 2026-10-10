import { useMemo, useState } from "react";
import { Gesture } from "react-native-gesture-handler";

import { nearestIndex } from "./scales";

/**
 * Tap-and-drag crosshair, replacing Recharts' hover tooltip.
 *  - Drag horizontally: the crosshair follows the finger (snapped to a bar)
 *    and stays where it was lifted.
 *  - Tap: show at the tapped bar; tap again to hide.
 *  - A mostly-vertical swipe fails the pan, so the page still scrolls.
 * Callbacks run on the JS thread (runOnJS) — they only set React state.
 */
export function useCrosshair(xs: readonly number[], testID: string) {
  const [index, setIndex] = useState<number | null>(null);

  const gesture = useMemo(() => {
    const at = (x: number) => {
      const i = nearestIndex(xs, x);
      return i < 0 ? null : i;
    };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onStart((e) => setIndex(at(e.x)))
      .onUpdate((e) => setIndex(at(e.x)))
      .withTestId(`${testID}-pan`);
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e, success) => {
        if (success) setIndex((prev) => (prev === null ? at(e.x) : null));
      })
      .withTestId(`${testID}-tap`);
    return Gesture.Race(pan, tap);
  }, [xs, testID]);

  // The data can shrink under a visible crosshair (500 → 60 bars). An index
  // past the end is treated as "no crosshair" rather than read out of range.
  const safeIndex = index !== null && index < xs.length ? index : null;
  return { index: safeIndex, gesture };
}
