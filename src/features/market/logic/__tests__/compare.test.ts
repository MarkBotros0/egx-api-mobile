import { COMPARE, TICKERS } from "@/features/market/testing/fixtures";
import {
  addCompareSymbol,
  buildCompareSeries,
  canCompare,
  compareRangeError,
  compareSuggestions,
  defaultCompareRange,
  isIsoDate,
  rangeEndingAt,
} from "../compare";

describe("isIsoDate", () => {
  it("accepts only real YYYY-MM-DD dates", () => {
    expect(isIsoDate("2026-12-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1")).toBe(false);
    expect(isIsoDate("2026-2-03")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("ranges", () => {
  const now = new Date(2026, 9, 10);
  it("defaults to six months back, in local dates", () => {
    expect(defaultCompareRange(now)).toEqual({ start: "2026-04-10", end: "2026-10-10" });
  });
  it("builds the preset ranges", () => {
    expect(rangeEndingAt(now, 3)).toEqual({ start: "2026-07-10", end: "2026-10-10" });
    expect(rangeEndingAt(now, 12)).toEqual({ start: "2025-10-10", end: "2026-10-10" });
  });
});

describe("compareRangeError", () => {
  it.each([
    ["2026-1", "2026-10-10", "Start date must be YYYY-MM-DD"],
    ["2026-02-30", "2026-10-10", "Start date must be YYYY-MM-DD"],
    ["2026-04-10", "2026-10", "End date must be YYYY-MM-DD"],
    ["2026-10-11", "2026-10-10", "Start date must be on or before the end date"],
    ["2026-04-10", "2026-10-10", null],
  ])("%s → %s", (start, end, err) => {
    expect(compareRangeError(start, end)).toBe(err);
  });
});

describe("compareSuggestions", () => {
  it("matches symbol or name, skips selected, caps the list", () => {
    expect(compareSuggestions(TICKERS, "com", []).map((t) => t.symbol)).toEqual(["COMI", "ETEL"]);
    expect(compareSuggestions(TICKERS, "com", ["COMI"]).map((t) => t.symbol)).toEqual(["ETEL"]);
    expect(compareSuggestions(TICKERS, "a", [], 2)).toHaveLength(2);
    expect(compareSuggestions(TICKERS, "  ", [])).toEqual([]);
  });
});

describe("addCompareSymbol / canCompare", () => {
  it("adds once and stops at the maximum", () => {
    expect(addCompareSymbol(["COMI"], "TMGH")).toEqual(["COMI", "TMGH"]);
    expect(addCompareSymbol(["COMI"], "COMI")).toEqual(["COMI"]);
    expect(addCompareSymbol(["A", "B", "C", "D", "E"], "F")).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("needs two stocks and a valid range", () => {
    expect(canCompare(["COMI"], "2026-04-10", "2026-10-10")).toBe(false);
    expect(canCompare(["COMI", "TMGH"], "2026-04-10", "2026-10-10")).toBe(true);
    expect(canCompare(["COMI", "TMGH"], "2026-4", "2026-10-10")).toBe(false);
  });
});

describe("buildCompareSeries", () => {
  it("keeps the selection order and skips symbols without data", () => {
    expect(buildCompareSeries(COMPARE, ["TMGH", "COMI", "NOPE"])).toEqual([
      { symbol: "TMGH", values: [100, 95] },
      { symbol: "COMI", values: [100, 112.34] },
    ]);
    expect(buildCompareSeries(null, ["COMI"])).toEqual([]);
  });
});
