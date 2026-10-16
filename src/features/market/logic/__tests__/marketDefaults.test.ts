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

describe("adjective and risk blurbs", () => {
  test("an old backend without adjective gets one", () => {
    expect(withMarketDefaults({ ...EG_FALLBACK, adjective: undefined as any }).adjective).toBe("Egyptian");
    expect(
      withMarketDefaults({ ...EG_FALLBACK, code: "US", short_name: "US", adjective: undefined as any }).adjective
    ).toBe("US");
  });

  test("risk blurbs name the market, and EG's are unchanged", () => {
    const { riskBandBlurbs, RISK_BAND_BLURB } = require("@/shared/riskBands");
    expect(RISK_BAND_BLURB.calm).toBe("moves least of the tradeable EGX names");
    expect(RISK_BAND_BLURB.average).toBe("moves about as much as the typical EGX stock");
    expect(riskBandBlurbs("US").calm).toBe("moves least of the tradeable US names");
    expect(riskBandBlurbs("US").wild).toBe("moves most of the tradeable US names");
  });
});
