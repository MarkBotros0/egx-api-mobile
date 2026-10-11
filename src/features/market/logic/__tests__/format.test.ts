import { changeText, coarse, dayMonth, formatPE, formatVolume, pct, pctText } from "../format";

describe("changeText", () => {
  it("signs both figures from the percentage", () => {
    expect(changeText(1.2, 1.48)).toBe("+1.20 (+1.48%)");
    expect(changeText(-0.9, -1.47)).toBe("-0.90 (-1.47%)");
    expect(changeText(0, 0)).toBe("+0.00 (+0.00%)");
  });
});

describe("pctText", () => {
  it("formats a signed percentage", () => {
    expect(pctText(1.5)).toBe("+1.50%");
    expect(pctText(-1.47)).toBe("-1.47%");
  });
});

describe("formatVolume", () => {
  it("abbreviates millions and thousands", () => {
    expect(formatVolume(2_500_000)).toBe("2.5M");
    expect(formatVolume(12_345)).toBe("12K");
    expect(formatVolume(950)).toBe("950");
  });
});

describe("coarse", () => {
  it("rounds to the precision the measurement supports", () => {
    expect(coarse(1234.4)).toBe("1234");
    expect(coarse(96.44)).toBe("96.4");
    expect(coarse(-12.34)).toBe("-12.3");
    expect(coarse(7.4)).toBe("7.40");
    expect(coarse(Number.NaN)).toBe("—");
  });
});

describe("formatPE", () => {
  it("adds the fetch date when there is one", () => {
    expect(formatPE({ pe_ratio: 9.14, fetched_at: "2026-09-01T03:00:00Z" })).toBe(
      "9.1 · as of 2026-09-01"
    );
    expect(formatPE({ pe_ratio: 9.14, fetched_at: "" })).toBe("9.1");
    expect(formatPE({ pe_ratio: null, fetched_at: "" })).toBe("—");
  });
});

describe("dayMonth", () => {
  it("turns an ISO date into day + month", () => {
    expect(dayMonth("2026-04-07")).toBe("7 Apr");
  });
  it("passes through what it cannot read", () => {
    expect(dayMonth("bad")).toBe("bad");
    expect(dayMonth("2026-13-07")).toBe("2026-13-07");
  });
});

describe("pct", () => {
  it("builds a percentage dimension", () => {
    expect(pct(42)).toBe("42%");
  });
});
