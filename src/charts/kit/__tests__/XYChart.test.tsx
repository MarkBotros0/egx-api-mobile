import { render, screen } from "@testing-library/react-native";

import { layoutChart, renderChart, scrubChart, tapChart } from "@/test-utils/charts";

import { XYChart } from "../XYChart";
import type { XYSeries } from "../xyModel";

// FRAME at width 340, yAxisWidth 40: plot x from 40 to 336.
const labels = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
// point layout: xs = 40, 138.67, 237.33, 336
const series: XYSeries[] = [
  { kind: "line", id: "close", name: "Close", values: [10, 11, null, 13], color: "#ffffff" },
  { kind: "line", id: "sma", name: "SMA", values: [null, 10.5, 10.75, 11], color: "#ffaa00", connectNulls: true },
];

describe("XYChart", () => {
  it("draws nothing until the parent has measured a width", async () => {
    await renderChart(<XYChart labels={labels} series={series} height={150} />);
    expect(screen.getByTestId("xy-chart")).toBeTruthy();
    expect(screen.queryByTestId("xy-chart-svg")).toBeNull();
  });

  it("draws every line once laid out", async () => {
    await renderChart(<XYChart labels={labels} series={series} height={150} />);
    await layoutChart("xy-chart");
    expect(screen.getByTestId("xy-chart-svg")).toBeTruthy();
    expect(screen.getByTestId("line-close")).toBeTruthy();
    expect(screen.getByTestId("line-sma")).toBeTruthy();
  });

  it("draws nothing for an empty series list without crashing", async () => {
    await renderChart(<XYChart labels={[]} series={[]} height={150} />);
    await layoutChart("xy-chart");
    expect(screen.queryByTestId("xy-chart-svg")).toBeNull();
  });

  it("scrubbing shows the date and each series at the nearest bar", async () => {
    await renderChart(<XYChart labels={labels} series={series} height={150} />);
    await layoutChart("xy-chart");
    await scrubChart("xy-chart", 330);
    expect(screen.getByTestId("chart-readout")).toBeTruthy();
    expect(screen.getByTestId("crosshair")).toBeTruthy();
    expect(screen.getByText("2026-03-04")).toBeTruthy();
    expect(screen.getByText("Close: 13.00")).toBeTruthy();
    expect(screen.getByText("SMA: 11.00")).toBeTruthy();
  });

  it("shows -- for a series with no value at that bar", async () => {
    await renderChart(<XYChart labels={labels} series={series} height={150} />);
    await layoutChart("xy-chart");
    await scrubChart("xy-chart", 240);
    expect(screen.getByText("2026-03-03")).toBeTruthy();
    expect(screen.getByText("Close: --")).toBeTruthy();
    expect(screen.getByText("SMA: 10.75")).toBeTruthy();
  });

  it("a tap shows the readout and a second tap hides it", async () => {
    await renderChart(<XYChart labels={labels} series={series} height={150} />);
    await layoutChart("xy-chart");
    await tapChart("xy-chart", 45);
    expect(screen.getByText("2026-03-01")).toBeTruthy();
    await tapChart("xy-chart", 45);
    expect(screen.queryByTestId("chart-readout")).toBeNull();
  });

  it("uses the readout title and value formatters and skips series marked out of the readout", async () => {
    await renderChart(
      <XYChart
        labels={labels}
        series={[
          series[0],
          { ...series[1], inReadout: false } as XYSeries,
        ]}
        height={150}
        readoutTitle={(label, i) => `Day ${i + 1} (${label})`}
        readoutFormat={(v, id) => `${id}=${v.toFixed(1)}`}
      />,
    );
    await layoutChart("xy-chart");
    await scrubChart("xy-chart", 40);
    expect(screen.getByText("Day 1 (2026-03-01)")).toBeTruthy();
    expect(screen.getByText("Close: close=10.0")).toBeTruthy();
    expect(screen.queryByText(/^SMA:/)).toBeNull();
  });

  it("drops the readout when the data shrinks under it", async () => {
    const long = Array.from({ length: 10 }, (_, i) => `d${i}`);
    const longSeries: XYSeries[] = [{ kind: "line", id: "s", name: "S", values: long.map((_, i) => i), color: "#fff" }];
    // Plain render (no provider wrapper) so rerender keeps the same root
    // element and the measured width survives — the chart must still be drawn
    // afterwards, otherwise this test would pass for the wrong reason.
    await render(<XYChart labels={long} series={longSeries} height={150} />);
    await layoutChart("xy-chart");
    await scrubChart("xy-chart", 336);
    expect(screen.getByText("d9")).toBeTruthy();

    const short = long.slice(0, 3);
    const shortSeries: XYSeries[] = [{ kind: "line", id: "s", name: "S", values: [0, 1, 2], color: "#fff" }];
    await screen.rerender(<XYChart labels={short} series={shortSeries} height={150} />);
    expect(screen.getByTestId("xy-chart-svg")).toBeTruthy();
    expect(screen.queryByTestId("chart-readout")).toBeNull();
  });
});
