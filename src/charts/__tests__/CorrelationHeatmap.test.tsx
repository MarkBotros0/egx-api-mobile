import { fireEvent, screen } from "@testing-library/react-native";

import type { CorrelationMatrix } from "@/shared/types";
import { renderChart } from "@/test-utils/charts";

import { cellColorClass, cellTextClass, CorrelationHeatmap, correlationPairs } from "../CorrelationHeatmap";

const data: CorrelationMatrix = {
  symbols: ["COMI", "ETEL", "HRHO", "TMGH"],
  matrix: [
    [1, 0.82, 0.7, 0.1],
    [0.82, 1, 0.2, -0.45],
    [0.7, 0.2, 1, -0.3],
    [0.1, -0.45, -0.3, 1],
  ],
};

describe("correlationPairs", () => {
  it("flags pairs strictly above 0.7 and strictly below -0.3", () => {
    const { high, low } = correlationPairs(data);
    expect(high).toEqual([{ a: "COMI", b: "ETEL", corr: 0.82 }]); // 0.7 exactly is not "high"
    expect(low).toEqual([{ a: "ETEL", b: "TMGH", corr: -0.45 }]); // -0.3 exactly is not "low"
  });

  it("skips a non-finite cell", () => {
    const broken: CorrelationMatrix = { symbols: ["A", "B"], matrix: [[1, NaN], [NaN, 1]] };
    expect(correlationPairs(broken)).toEqual({ high: [], low: [] });
  });
});

describe("cell classes", () => {
  it("steps through the web's colour bands", () => {
    expect(cellColorClass(0.7)).toBe("bg-red-500/60");
    expect(cellColorClass(0.4)).toBe("bg-red-500/30");
    expect(cellColorClass(0.1)).toBe("bg-red-500/10");
    expect(cellColorClass(-0.1)).toBe("bg-white/5");
    expect(cellColorClass(-0.4)).toBe("bg-blue-500/20");
    expect(cellColorClass(-0.41)).toBe("bg-blue-500/40");
    expect(cellColorClass(NaN)).toBe("bg-white/5");
    expect(cellTextClass(0.7)).toBe("text-white");
    expect(cellTextClass(0.4)).toBe("text-white/80");
    expect(cellTextClass(0.39)).toBe("text-white/60");
  });
});

describe("CorrelationHeatmap", () => {
  it("lists the risky and the diversifying pairs", async () => {
    await renderChart(<CorrelationHeatmap data={data} />);
    expect(screen.getByText("Correlation Matrix")).toBeTruthy();
    expect(screen.getByText("Highly Correlated (risk)")).toBeTruthy();
    expect(screen.getByText("COMI & ETEL")).toBeTruthy();
    expect(screen.getByText("0.82")).toBeTruthy();
    expect(screen.getByText("Well Diversified")).toBeTruthy();
    expect(screen.getByText("ETEL & TMGH")).toBeTruthy();
  });

  it("says when there is nothing notable", async () => {
    await renderChart(<CorrelationHeatmap data={{ symbols: ["A", "B"], matrix: [[1, 0.2], [0.2, 1]] }} />);
    expect(screen.getByText("No notable correlation patterns detected.")).toBeTruthy();
  });

  it("renders nothing for a single symbol", async () => {
    await renderChart(<CorrelationHeatmap data={{ symbols: ["A"], matrix: [[1]] }} />);
    expect(screen.queryByText("Correlation Matrix")).toBeNull();
  });

  it("opens and closes the full matrix", async () => {
    await renderChart(<CorrelationHeatmap data={data} />);
    expect(screen.queryByTestId("correlation-grid")).toBeNull();
    await fireEvent.press(screen.getByText("Show full matrix"));
    expect(screen.getByTestId("correlation-grid")).toBeTruthy();
    expect(screen.getAllByText("1.0")).toHaveLength(4);
    expect(screen.getByText("Moderate")).toBeTruthy();
    await fireEvent.press(screen.getByText("Hide full matrix"));
    expect(screen.queryByTestId("correlation-grid")).toBeNull();
  });

  it("prints -- for a cell the backend could not compute", async () => {
    await renderChart(<CorrelationHeatmap data={{ symbols: ["A", "B"], matrix: [[1, NaN], [NaN, 1]] }} />);
    await fireEvent.press(screen.getByText("Show full matrix"));
    expect(screen.getAllByText("--")).toHaveLength(2);
  });
});
