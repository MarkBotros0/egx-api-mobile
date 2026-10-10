import { screen } from "@testing-library/react-native";

import { CHART } from "@/charts/kit/palette";
import { renderChart } from "@/test-utils/charts";

import { Sparkline, sparklineModel } from "../Sparkline";

describe("sparklineModel", () => {
  it("is gain-coloured when the window ends at or above where it started", () => {
    expect(sparklineModel([10, 8, 12], 64, 32)?.color).toBe(CHART.gain);
    expect(sparklineModel([10, 14, 10], 64, 32)?.color).toBe(CHART.gain);
  });

  it("is loss-coloured when the window ends lower, whatever the last bar did", () => {
    // fell over the month, ticked up on the last day — still a falling line
    const m = sparklineModel([20, 15, 12, 11, 11.5], 64, 32);
    expect(m?.color).toBe(CHART.loss);
    expect(m?.up).toBe(false);
  });

  it("needs at least two finite points", () => {
    expect(sparklineModel([], 64, 32)).toBeNull();
    expect(sparklineModel([5], 64, 32)).toBeNull();
    expect(sparklineModel([5, NaN], 64, 32)).toBeNull();
  });

  it("draws an all-equal window as a flat line inside the box", () => {
    const m = sparklineModel([7, 7, 7], 64, 32);
    expect(m).not.toBeNull();
    expect(m?.d).not.toContain("NaN");
  });
});

describe("Sparkline", () => {
  it("labels the trend for screen readers", async () => {
    await renderChart(<Sparkline values={[1, 2, 3]} />);
    expect(screen.getByLabelText("Trend up")).toBeTruthy();
  });

  it("renders nothing for a single point", async () => {
    await renderChart(<Sparkline values={[3]} />);
    expect(screen.queryByTestId("sparkline")).toBeNull();
  });
});
