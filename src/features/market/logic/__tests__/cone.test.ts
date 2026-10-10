import { FORECAST } from "@/features/market/testing/fixtures";
import { coneGeometry } from "../cone";

const band = FORECAST.outcome_band!;

it("draws each band as a closed path from today's price", () => {
  const g = coneGeometry(band, 104, 48, 4);
  expect(g).toEqual({
    outer: "M4.0,24.0 L52.0,14.0 L100.0,4.0 L100.0,44.0 L52.0,34.0 L4.0,24.0 Z",
    inner: "M4.0,24.0 L52.0,19.0 L100.0,14.0 L100.0,34.0 L52.0,29.0 L4.0,24.0 Z",
    refY: 24,
    min: 80,
    max: 120,
  });
});

it("draws nothing before it has a width or without bands", () => {
  expect(coneGeometry(band, 0, 48)).toBeNull();
  expect(coneGeometry({ ...band, bands: [] }, 104, 48)).toBeNull();
});
