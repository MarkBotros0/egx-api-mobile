import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { buildXYModel } from "@/charts/kit/xyModel";
import { learnHref } from "@/lib/links";
import type { TrendLine, TrendLines } from "@/shared/types";
import { layoutChart, renderChart, scrubChart } from "@/test-utils/charts";

import { buildPriceSeries, PriceChart, priceRefLines, type PriceDataPoint } from "../PriceChart";

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  router: { push: jest.fn() },
}));

const dates = Array.from({ length: 12 }, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`);
const data: PriceDataPoint[] = dates.map((date, i) => ({
  date,
  open: 100 + i,
  high: 102 + i,
  low: 99 + i,
  close: 100.5 + i,
  sma_20: i < 3 ? null : 100 + i,
  bollinger_upper: 104 + i,
  bollinger_middle: 100 + i,
  bollinger_lower: 96 + i,
  trend_support: i < 2 ? null : 98 + i * 0.5,
  trend_resistance: i < 1 ? null : 106 + i * 0.4,
}));
const trend = (anchorIdx: number[], direction: "up" | "down"): TrendLine => ({
  values: [],
  anchors: anchorIdx.map((i) => ({ date: dates[i], price: 100 })),
  direction,
  slope_pct_per_bar: 0.5,
});
const both: TrendLines = { support: trend([2, 6, 10], "up"), resistance: trend([1, 5, 9], "down") };

beforeEach(() => jest.mocked(router.push).mockClear());

describe("buildPriceSeries", () => {
  it("stacks overlays in the web's draw order", () => {
    const ids = buildPriceSeries(
      data,
      { bollinger: true, sma20: true, sma200: true, trendlines: true },
      both.support,
      both.resistance,
    ).map((s) => s.id);
    expect(ids).toEqual(["bb_band", "bb_upper", "bb_lower", "close", "sma_20", "sma_200", "trend_support", "trend_resistance"]);
  });

  it("draws a trendline straight and dashed, with dots only on its anchor bars", () => {
    const s = buildPriceSeries(data, { trendlines: true }, both.support, null).find((x) => x.id === "trend_support");
    expect(s).toMatchObject({ kind: "line", curve: "linear", dash: "6 3", activeDot: false, anchorIndices: [2, 6, 10] });
    expect(s && "connectNulls" in s ? s.connectNulls : undefined).toBeFalsy();
  });

  it("connects gaps in the overlay lines but never in a trendline", () => {
    const series = buildPriceSeries(
      data,
      { bollinger: true, sma20: true, sma50: true, sma200: true, ema12: true, ema26: true, trendlines: true },
      both.support,
      both.resistance,
    );
    const connected = (id: string) => {
      const s = series.find((x) => x.id === id);
      return s && "connectNulls" in s ? s.connectNulls : undefined;
    };
    for (const id of ["bb_band", "bb_upper", "bb_lower", "sma_20", "sma_50", "sma_200", "ema_12", "ema_26"]) {
      expect(connected(id)).toBe(true);
    }
    expect(connected("close")).toBeFalsy();
    expect(connected("trend_support")).toBeFalsy();
    expect(connected("trend_resistance")).toBeFalsy();
  });

  it("adds no trendline series for a side the backend did not draw", () => {
    const ids = buildPriceSeries(data, { trendlines: true }, null, null).map((s) => s.id);
    expect(ids).toEqual(["close"]);
  });
});

describe("priceRefLines", () => {
  it("labels supports, resistances and Fibonacci levels like the web", () => {
    const lines = priceRefLines(
      [{ price: 95, strength: 3 }],
      [{ price: 120, strength: 2 }],
      { high: 120, low: 90, levels: { "0%": 120, "61.8%": 101.46 } },
    );
    expect(lines.map((l) => l.label)).toEqual(["S 95.00", "R 120.00", "0%", "61.8%"]);
    expect(lines.map((l) => l.labelSide)).toEqual(["left", "left", "right", "right"]);
    expect(lines.every((l) => l.extendDomain)).toBe(true);
  });

  it("levels from outside the visible bars are kept on the chart", () => {
    const model = buildXYModel({
      labels: dates,
      series: buildPriceSeries(data, {}, null, null),
      refLines: priceRefLines([{ price: 60, strength: 1 }], [{ price: 150, strength: 1 }], null),
      width: 340,
      height: 300,
      yAxisWidth: 48,
      xAxisHeight: 18,
      xMinTickGap: 80,
    });
    expect(model.refLines.map((r) => r.label)).toEqual(["S 60.00", "R 150.00"]);
  });
});

describe("PriceChart", () => {
  it("says so when there is no data", async () => {
    await renderChart(<PriceChart data={[]} />);
    expect(screen.getByText("No price data available")).toBeTruthy();
  });

  it("names both drawn trendlines and puts a dot on each anchor", async () => {
    await renderChart(<PriceChart data={data} overlays={{ trendlines: true }} trendlines={both} height={300} />);
    await layoutChart("price-chart");
    expect(screen.getByText("lows (rising)")).toBeTruthy();
    expect(screen.getByText("highs (falling)")).toBeTruthy();
    expect(screen.getAllByTestId("anchor-trend_support")).toHaveLength(3);
    expect(screen.getAllByTestId("anchor-trend_resistance")).toHaveLength(3);
  });

  it("explains an empty overlay as a decision, not an omission", async () => {
    await renderChart(
      <PriceChart data={data} overlays={{ trendlines: true }} trendlines={{ support: null, resistance: null }} />,
    );
    await layoutChart("price-chart");
    expect(
      screen.getByText("No trendline: the last 3 pivots do not line up, or price has not respected the line."),
    ).toBeTruthy();
    expect(screen.queryAllByTestId(/^anchor-/)).toHaveLength(0);
  });

  it("shows no caption and no trendlines when the overlay is off", async () => {
    await renderChart(<PriceChart data={data} overlays={{ trendlines: false }} trendlines={both} />);
    await layoutChart("price-chart");
    expect(screen.queryByText("Learn more →")).toBeNull();
    expect(screen.queryAllByTestId(/^anchor-/)).toHaveLength(0);
  });

  it("links the caption to the trendlines lesson", async () => {
    await renderChart(<PriceChart data={data} overlays={{ trendlines: true }} trendlines={both} />);
    await fireEvent.press(screen.getByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("trendlines"));
  });

  it("reads out close and only the trendline sides that were drawn", async () => {
    await renderChart(
      <PriceChart
        data={data}
        overlays={{ trendlines: true }}
        trendlines={{ support: null, resistance: both.resistance }}
        height={300}
      />,
    );
    await layoutChart("price-chart");
    await scrubChart("price-chart", 336);
    expect(screen.getByText("2026-03-12")).toBeTruthy();
    expect(screen.getByText("Close: 111.50")).toBeTruthy();
    expect(screen.getByText("Trend resistance: 110.40")).toBeTruthy();
    expect(screen.queryByText(/^Trend support:/)).toBeNull();
  });
});
