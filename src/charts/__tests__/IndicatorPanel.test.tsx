import { fireEvent, screen } from "@testing-library/react-native";

import { layoutChart, renderChart, scrubChart } from "@/test-utils/charts";

import { IndicatorPanel, type IndicatorDataPoint } from "../IndicatorPanel";

const data: IndicatorDataPoint[] = [
  { date: "2026-03-01", rsi: null, macd_line: null, macd_signal: null, macd_histogram: null, stochastic_k: null, stochastic_d: null, obv: 1000 },
  { date: "2026-03-02", rsi: 28.44, macd_line: 0.5, macd_signal: 0.38, macd_histogram: 0.12, stochastic_k: 85.04, stochastic_d: 80, obv: 2_500_000 },
];

describe("IndicatorPanel", () => {
  it("opens on RSI with its zones", async () => {
    await renderChart(<IndicatorPanel data={data} />);
    expect(screen.getByText("RSI (14)")).toBeTruthy();
    expect(screen.getByText("Oversold (<30)")).toBeTruthy();
    expect(screen.getByText("Overbought (>70)")).toBeTruthy();
    await layoutChart("rsi-chart");
    await scrubChart("rsi-chart", 336);
    expect(screen.getByText("RSI: 28.4")).toBeTruthy();
  });

  it("shows MACD with histogram, line and signal to 3 decimals", async () => {
    await renderChart(<IndicatorPanel data={data} />);
    await fireEvent.press(screen.getByText("MACD"));
    expect(screen.getByText("MACD (12, 26, 9)")).toBeTruthy();
    await layoutChart("macd-chart");
    await scrubChart("macd-chart", 336);
    expect(screen.getByText("Histogram: 0.120")).toBeTruthy();
    expect(screen.getByText("MACD: 0.500")).toBeTruthy();
    expect(screen.getByText("Signal: 0.380")).toBeTruthy();
  });

  it("shows Stochastic as %K and %D with its own zones", async () => {
    await renderChart(<IndicatorPanel data={data} />);
    await fireEvent.press(screen.getByText("Stochastic"));
    expect(screen.getByText("Stochastic (14, 3)")).toBeTruthy();
    expect(screen.getByText("Oversold (<20)")).toBeTruthy();
    await layoutChart("stochastic-chart");
    await scrubChart("stochastic-chart", 336);
    expect(screen.getByText("%K: 85.0")).toBeTruthy();
    expect(screen.getByText("%D: 80.0")).toBeTruthy();
  });

  it("shows OBV with a grouped full number", async () => {
    await renderChart(<IndicatorPanel data={data} />);
    await fireEvent.press(screen.getByText("OBV"));
    await layoutChart("obv-chart");
    await scrubChart("obv-chart", 336);
    expect(screen.getByText("OBV: 2,500,000")).toBeTruthy();
  });

  it("shows -- for a bar where the indicator has not started", async () => {
    await renderChart(<IndicatorPanel data={data} />);
    await layoutChart("rsi-chart");
    await scrubChart("rsi-chart", 40);
    expect(screen.getByText("RSI: --")).toBeTruthy();
  });
});
