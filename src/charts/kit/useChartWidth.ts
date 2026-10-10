import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

/**
 * Width of the chart's own box, from onLayout. 0 until the first layout, so
 * callers draw nothing rather than drawing at a guessed width. Never read
 * Dimensions here: a chart inside a padded card is narrower than the screen.
 */
export function useChartWidth(): { width: number; onLayout: (e: LayoutChangeEvent) => void } {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);
  return { width, onLayout };
}
