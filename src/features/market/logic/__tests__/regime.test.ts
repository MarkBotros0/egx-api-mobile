import { breadthTone, positiveRateSplit, regimePosition } from "../regime";

describe("regimePosition", () => {
  it("places the mean on the 35–60 range it has historically occupied", () => {
    expect(regimePosition(35)).toBe(0);
    expect(regimePosition(47.5)).toBe(50);
    expect(regimePosition(60)).toBe(100);
  });
  it("clamps outside the range and is null without a reading", () => {
    expect(regimePosition(20)).toBe(0);
    expect(regimePosition(70)).toBe(100);
    expect(regimePosition(null)).toBeNull();
  });
});

describe("breadthTone", () => {
  it("only claims a direction outside the 45–55 neutral middle", () => {
    expect(breadthTone(55)).toBe("gain");
    expect(breadthTone(54.9)).toBe("neutral");
    expect(breadthTone(50)).toBe("neutral");
    expect(breadthTone(45)).toBe("loss");
  });
});

describe("positiveRateSplit", () => {
  it("states both sides of the rate", () => {
    expect(positiveRateSplit(0.58)).toEqual({ positive: 58, other: 42 });
  });
});
