import { screen } from "@testing-library/react-native";

import { layoutChart, renderChart, scrubChart } from "@/test-utils/charts";

import { CompareChart } from "../CompareChart";

const dates = ["2026-03-01", "2026-03-02", "2026-03-03"];

describe("CompareChart", () => {
  it("asks for a selection when there is nothing to compare", async () => {
    await renderChart(<CompareChart dates={[]} series={[]} />);
    expect(screen.getByText("Select stocks to compare")).toBeTruthy();
    await renderChart(<CompareChart dates={dates} series={[]} />);
    expect(screen.getAllByText("Select stocks to compare")).toHaveLength(1);
  });

  it("draws a line and a legend entry per symbol and reads out percentages", async () => {
    await renderChart(
      <CompareChart
        dates={dates}
        series={[
          { symbol: "COMI", values: [0, 1.234, 2.5] },
          { symbol: "ETEL", values: [null, -0.5, -1.25] },
        ]}
      />,
    );
    expect(screen.getByTestId("legend-COMI")).toBeTruthy();
    expect(screen.getByTestId("legend-ETEL")).toBeTruthy();
    await layoutChart("compare-chart");
    expect(screen.getByTestId("line-COMI")).toBeTruthy();
    await scrubChart("compare-chart", 336);
    expect(screen.getByText("COMI: 2.50%")).toBeTruthy();
    expect(screen.getByText("ETEL: -1.25%")).toBeTruthy();
  });

  it("keeps the legend but draws no line for a symbol with no data", async () => {
    await renderChart(
      <CompareChart
        dates={dates}
        series={[
          { symbol: "COMI", values: [0, 1, 2] },
          { symbol: "HRHO", values: [null, null, null] },
        ]}
      />,
    );
    await layoutChart("compare-chart");
    expect(screen.getByTestId("legend-HRHO")).toBeTruthy();
    expect(screen.queryByTestId("line-HRHO")).toBeNull();
  });
});
