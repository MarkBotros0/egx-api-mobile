import { renderRouter, screen } from "expo-router/testing-library";

import ChartsGalleryRoute from "@/app/dev/charts";

describe("/dev/charts", () => {
  it("renders every chart section from fixtures", async () => {
    await renderRouter({ "dev/charts": ChartsGalleryRoute }, { initialUrl: "/dev/charts" });
    expect(screen.getByText("Chart gallery")).toBeTruthy();
    for (const title of [
      "CompositeGauge",
      "Sparkline",
      "PriceChart",
      "VolumeChart",
      "IndicatorPanel",
      "CompareChart",
      "MonteCarloChart",
      "CorrelationHeatmap",
      "AllocationBar / AllocationDonut",
      "Edge cases",
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("shows the fixture's trendline caption and correlation pairs", async () => {
    await renderRouter({ "dev/charts": ChartsGalleryRoute }, { initialUrl: "/dev/charts" });
    expect(screen.getByText("COMI & ETEL")).toBeTruthy();
    expect(screen.getAllByText("Learn more →").length).toBeGreaterThan(0);
    expect(screen.getByText("Select stocks to compare")).toBeTruthy();
    expect(screen.getByText("No price data available")).toBeTruthy();
  });
});
