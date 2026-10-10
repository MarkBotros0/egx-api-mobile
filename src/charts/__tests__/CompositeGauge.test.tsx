import { screen } from "@testing-library/react-native";

import { renderChart } from "@/test-utils/charts";

import { CompositeGauge, scoreColor } from "../CompositeGauge";

describe("scoreColor (lower-bound-inclusive bands, as the backend's classify_signal)", () => {
  it("starts each band on its own hue at the boundary", () => {
    expect(scoreColor(0)).toBe("#ff3355");
    expect(scoreColor(20)).toBe("#ff6644"); // Sell, not Strong Sell
    expect(scoreColor(40)).toBe("#ffaa00");
    expect(scoreColor(60)).toBe("#00cc66");
    expect(scoreColor(80)).toBe("#00e07a");
    expect(scoreColor(100)).toBe("#00ff88");
  });

  it("interpolates inside a band", () => {
    expect(scoreColor(10)).toBe("#ff4d4d");
  });

  it("clamps outside 0–100", () => {
    expect(scoreColor(-5)).toBe("#ff3355");
    expect(scoreColor(150)).toBe("#00ff88");
  });
});

describe("CompositeGauge", () => {
  it("announces the rounded score and the condition word", async () => {
    await renderChart(<CompositeGauge score={71.6} signal="Strong" size="lg" />);
    expect(screen.getByLabelText("Composite score 72 Strong")).toBeTruthy();
  });

  it("omits the signal from the label when there is none", async () => {
    await renderChart(<CompositeGauge score={55} signal={null} size="sm" />);
    expect(screen.getByLabelText("Composite score 55")).toBeTruthy();
  });

  it.each([null, undefined, NaN, Infinity])("says unavailable for %p", async (score) => {
    await renderChart(<CompositeGauge score={score} />);
    expect(screen.getByLabelText("Composite score unavailable")).toBeTruthy();
    expect(screen.queryByTestId("gauge-pulse")).toBeNull();
  });

  it("pulses for a Strong-Sell score below 20", async () => {
    await renderChart(<CompositeGauge score={19.4} signal="Very Weak" />);
    expect(screen.getByTestId("gauge-pulse")).toBeTruthy();
  });

  it("does not pulse at exactly 20 (that is plain Sell)", async () => {
    await renderChart(<CompositeGauge score={20} signal="Weak" />);
    expect(screen.queryByTestId("gauge-pulse")).toBeNull();
  });
});
