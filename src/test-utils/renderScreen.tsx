import type { ReactElement } from "react";
import { render } from "@testing-library/react-native";
import { TestSafeArea } from "./safeArea";

/**
 * Render a screen that needs safe-area context but none of the data
 * providers (Learn, Calibration, Admin). Uses RNTL's `wrapper`, so
 * `rerender` keeps the provider.
 */
export function renderScreen(ui: ReactElement) {
  return render(ui, { wrapper: TestSafeArea });
}
