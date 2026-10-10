import { fireEvent, screen } from "@testing-library/react-native";

import { renderChart } from "@/test-utils/charts";

import { ALLOCATION_COLORS, AllocationBar, AllocationDonut, allocationSlices, donutArcs } from "../Allocation";

const allocation = { Banks: 42.5, Telecommunications: 21.3, "Real Estate": 18.2, Food: 12, Industrials: 6 };

describe("allocationSlices", () => {
  it("keeps the object order and cycles the web pie colours", () => {
    const many = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`S${i}`, 1]));
    const slices = allocationSlices(many);
    expect(slices.map((s) => s.name)[0]).toBe("S0");
    expect(slices[0].color).toBe(ALLOCATION_COLORS[0]);
    expect(slices[10].color).toBe(ALLOCATION_COLORS[0]);
  });

  it("treats a non-finite value as 0", () => {
    expect(allocationSlices({ A: NaN })[0].value).toBe(0);
  });
});

describe("donutArcs", () => {
  it("draws one arc per non-zero slice", () => {
    const arcs = donutArcs(allocationSlices({ A: 50, B: 0, C: 50 }), 160);
    expect(arcs.map((a) => a.slice.name)).toEqual(["A", "C"]);
  });

  it("draws a full ring for a single sector", () => {
    const arcs = donutArcs(allocationSlices({ Banks: 100 }), 160);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].d).not.toContain("NaN");
  });
});

describe("AllocationBar", () => {
  it("shows each sector with its rounded share", async () => {
    await renderChart(<AllocationBar allocation={allocation} />);
    expect(screen.getByText("Banks (43%)")).toBeTruthy();
    expect(screen.getByText("Industrials (6%)")).toBeTruthy();
  });

  it("renders nothing with no sectors", async () => {
    await renderChart(<AllocationBar allocation={{}} />);
    expect(screen.queryByTestId("allocation-bar")).toBeNull();
  });
});

describe("AllocationDonut", () => {
  it("tapping a legend item reads out that sector, tapping again hides it", async () => {
    await renderChart(<AllocationDonut allocation={allocation} />);
    expect(screen.queryByTestId("allocation-readout")).toBeNull();
    await fireEvent.press(screen.getByText("Banks (43%)"));
    expect(screen.getByText("Banks: 42.5%")).toBeTruthy();
    await fireEvent.press(screen.getByText("Banks (43%)"));
    expect(screen.queryByTestId("allocation-readout")).toBeNull();
  });

  it("renders nothing with no sectors", async () => {
    await renderChart(<AllocationDonut allocation={{}} />);
    expect(screen.queryByTestId("allocation-donut")).toBeNull();
  });
});
