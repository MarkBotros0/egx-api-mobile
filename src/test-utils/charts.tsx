import type { ReactElement } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State, type PanGesture, type TapGesture } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import { TestSafeArea } from "./safeArea";

/** Render a chart. The safe-area provider is there for LearnTerm's sheet. */
export async function renderChart(ui: ReactElement) {
  return render(ui, { wrapper: TestSafeArea });
}

/** Charts draw nothing until onLayout reports a width; Jest never lays out, so fire it. */
export async function layoutChart(testID: string, width = 340) {
  for (const node of screen.getAllByTestId(testID)) {
    await fireEvent(node, "layout", { nativeEvent: { layout: { x: 0, y: 0, width, height: 200 } } });
  }
}

/** Drag the crosshair to x (in the chart's own coordinates) and lift. */
export async function scrubChart(testID: string, x: number) {
  await act(async () => {
    fireGestureHandler<PanGesture>(getByGestureTestId(`${testID}-pan`), [
      { state: State.BEGAN, x, y: 10 },
      { state: State.ACTIVE, x, y: 10 },
      { state: State.END, x, y: 10 },
    ]);
  });
}

/** Tap the chart at x. */
export async function tapChart(testID: string, x: number) {
  await act(async () => {
    fireGestureHandler<TapGesture>(getByGestureTestId(`${testID}-tap`), [
      { state: State.BEGAN, x, y: 10 },
      { state: State.END, x, y: 10 },
    ]);
  });
}
