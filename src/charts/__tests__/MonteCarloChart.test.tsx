import { screen } from "@testing-library/react-native";

import type { MonteCarloResult } from "@/shared/types";
import { layoutChart, renderChart, scrubChart } from "@/test-utils/charts";

import {
  formatOutcome,
  lossChanceToneClass,
  MonteCarloChart,
  monteCarloSeries,
  outcomeToneClass,
} from "../MonteCarloChart";

const result: MonteCarloResult = {
  days: 3,
  initial_value: 100_000,
  probability_of_loss: 0.38,
  worst_case_5pct: 0.9,
  pessimistic_25pct: 0.97,
  median: 1.05,
  optimistic_75pct: 1.1,
  best_case_95pct: 0.968, // a portfolio whose 95th percentile is still a loss
  percentiles: {
    p5: [0.98, 0.95, 0.9],
    p25: [0.99, 0.98, 0.97],
    p50: [1, 1.02, 1.05],
    p75: [1.01, 1.05, 1.1],
    p95: [1.02, 1.08, 1.2],
  },
};

describe("Monte Carlo helpers", () => {
  it("signs an outcome from its own value", () => {
    expect(formatOutcome(1.05)).toBe("+5.0%");
    expect(formatOutcome(0.968)).toBe("-3.2%");
    expect(formatOutcome(1)).toBe("+0.0%");
  });

  it("colours an outcome from its own value", () => {
    expect(outcomeToneClass(1)).toBe("text-gain");
    expect(outcomeToneClass(0.999)).toBe("text-loss");
  });

  it("grades the chance of loss", () => {
    expect(lossChanceToneClass(0.51)).toBe("text-loss");
    expect(lossChanceToneClass(0.5)).toBe("text-yellow-400");
    expect(lossChanceToneClass(0.31)).toBe("text-yellow-400");
    expect(lossChanceToneClass(0.3)).toBe("text-gain");
  });

  it("scales multipliers to EGP, day labels from 1", () => {
    const { labels, series } = monteCarloSeries(result);
    expect(labels).toEqual(["1", "2", "3"]);
    const median = series.find((s) => s.id === "p50");
    expect(median && median.kind === "line" ? median.values : []).toEqual([100_000, 102_000, 105_000]);
  });

  it("a non-finite multiplier becomes a gap, not NaN", () => {
    const broken = { ...result, percentiles: { ...result.percentiles, p50: [1, NaN] } };
    const median = monteCarloSeries(broken).series.find((s) => s.id === "p50");
    expect(median && median.kind === "line" ? median.values : []).toEqual([100_000, null, null]);
  });
});

describe("MonteCarloChart", () => {
  it("shows the tiles with value-driven signs", async () => {
    await renderChart(<MonteCarloChart data={result} currency="EGP" />);
    expect(screen.getByText("Monte Carlo Simulation")).toBeTruthy();
    expect(screen.getByText("1,000 simulated scenarios over 3 days based on your portfolio's historical behavior.")).toBeTruthy();
    expect(screen.getByText("38%")).toBeTruthy();
    expect(screen.getByText("-10.0%")).toBeTruthy();
    expect(screen.getByText("+5.0%")).toBeTruthy();
    expect(screen.getByText("-3.2%")).toBeTruthy();
    expect(screen.queryByText("+-3.2%")).toBeNull();
  });

  it("reads out every percentile in EGP for the touched day", async () => {
    await renderChart(<MonteCarloChart data={result} currency="EGP" />);
    await layoutChart("monte-carlo-chart");
    await scrubChart("monte-carlo-chart", 336);
    expect(screen.getByText("Day 3")).toBeTruthy();
    expect(screen.getByText("Best 5%: 120,000 EGP")).toBeTruthy();
    expect(screen.getByText("Median: 105,000 EGP")).toBeTruthy();
    expect(screen.getByText("Worst 5%: 90,000 EGP")).toBeTruthy();
  });
});
