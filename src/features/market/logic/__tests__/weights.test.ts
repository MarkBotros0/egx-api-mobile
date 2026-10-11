import { DEFAULT_WEIGHTS } from "@/shared/constants";
import { rawTotal, stepWeight } from "../weights";

describe("stepWeight (the slider's 0–50, step 5)", () => {
  it("snaps to the next multiple of 5 in the pressed direction", () => {
    expect(stepWeight(18, 1)).toBe(20);
    expect(stepWeight(18, -1)).toBe(15);
    expect(stepWeight(20, 1)).toBe(25);
    expect(stepWeight(20, -1)).toBe(15);
  });
  it("clamps to 0–50", () => {
    expect(stepWeight(50, 1)).toBe(50);
    expect(stepWeight(0, -1)).toBe(0);
    expect(stepWeight(2, -1)).toBe(0);
  });
});

it("totals the raw weights", () => {
  expect(rawTotal(DEFAULT_WEIGHTS)).toBe(100);
});
