import { screen } from "@testing-library/react-native";

import { CHART, withAlpha } from "@/charts/kit/palette";
import { layoutChart, renderChart, scrubChart } from "@/test-utils/charts";

import { VolumeChart, volumeBarColors, type VolumeDataPoint } from "../VolumeChart";

const UP = withAlpha(CHART.gain, 0.5);
const DOWN = withAlpha(CHART.loss, 0.5);

const rows: VolumeDataPoint[] = [
  // first bar: no previous close anywhere → compared with its own open
  { date: "2026-03-01", volume: 900_000, open: 10, close: 10.2 },
  // gap-down that recovered off its low: up vs open, DOWN vs the previous close
  { date: "2026-03-02", volume: 1_500_000, open: 9, close: 9.5, prevClose: 10.2 },
  // no prevClose given → the previous row's close (9.5)
  { date: "2026-03-03", volume: 1_200, open: 9.9, close: 9.7 },
];

describe("volumeBarColors", () => {
  it("colours by close against the previous close", () => {
    expect(volumeBarColors(rows)).toEqual([UP, DOWN, UP]);
  });
});

describe("VolumeChart", () => {
  it("renders nothing without data", async () => {
    await renderChart(<VolumeChart data={[]} />);
    expect(screen.queryByText("Volume")).toBeNull();
  });

  it("reads out compact volume for the touched day", async () => {
    await renderChart(<VolumeChart data={rows} />);
    expect(screen.getByText("Volume")).toBeTruthy();
    await layoutChart("volume-chart");
    await scrubChart("volume-chart", 190);
    expect(screen.getByText("2026-03-02")).toBeTruthy();
    expect(screen.getByText("Volume: 1.5M")).toBeTruthy();
  });
});
