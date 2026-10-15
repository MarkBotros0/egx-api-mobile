import { withMarketDefaults, EG_FALLBACK } from "@/shared/markets";

describe("withMarketDefaults", () => {
  test("old backend market gets defaults", () => {
    const m = withMarketDefaults({
      ...EG_FALLBACK,
      code: "US",
      short_name: undefined as any,
      indices: undefined as any,
      score_calibrated: undefined as any,
    });
    expect(m.short_name).toBe("US");
    expect(m.score_calibrated).toBe(false);
    expect(m.indices).toEqual([]);
  });

  test("EG defaults to calibrated and keeps supplied fields", () => {
    const m = withMarketDefaults({ ...EG_FALLBACK, score_calibrated: undefined as any });
    expect(m.score_calibrated).toBe(true);
    const us = withMarketDefaults({
      ...EG_FALLBACK,
      code: "US",
      short_name: "US",
      score_calibrated: false,
      indices: [{ id: "SPX", label: "S&P 500" }],
    });
    expect(us.indices).toEqual([{ id: "SPX", label: "S&P 500" }]);
  });
});
