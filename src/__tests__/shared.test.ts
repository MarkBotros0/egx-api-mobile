import { scoreBand } from "@/shared/constants";
import { planSale } from "@/shared/positions";
import { COLORS } from "@/shared/theme";
import { EG_FALLBACK, isMarketOpen, type Market } from "@/shared/markets";
import { formatMoney, formatPrice } from "@/shared/money";
import { setApiMarket, withMarket } from "@/shared/api";

describe("shared lib copied from egx-api-fe", () => {
  it("bands scores with an inclusive lower bound, like the backend", () => {
    expect(scoreBand(80)).toBe("strong_buy");
    expect(scoreBand(79.99)).toBe("buy");
    expect(scoreBand(19.99)).toBe("strong_sell");
  });

  it("previews a sale oldest lot first", () => {
    const lots = [
      { id: "june", quantity: 100, buy_price: 45.2, buy_date: "2026-06-01" },
      { id: "jan", quantity: 200, buy_price: 41, buy_date: "2026-01-10" },
    ];
    expect(planSale(lots, 250).map((p) => [p.id, p.quantity])).toEqual([
      ["jan", 200],
      ["june", 50],
    ]);
  });

  it("exposes the brand colours", () => {
    expect(COLORS.gain).toBe("#00ff88");
  });
});

const US: Market = {
  ...EG_FALLBACK,
  code: "US",
  currency: "USD",
  timezone: "America/New_York",
  trading_days: [0, 1, 2, 3, 4],
  open: "09:30",
  close: "16:00",
  holidays: [{ date: "2026-11-26", name: "Thanksgiving Day" }],
};

describe("isMarketOpen", () => {
  it.each([
    ["2026-10-11T08:00:00Z", true],   // Sun 11:00 Cairo
    ["2026-10-11T11:31:00Z", false],  // Sun 14:31 Cairo
    ["2026-10-09T09:00:00Z", false],  // Friday
  ])("EG at %s -> %s", (iso, open) => {
    expect(isMarketOpen(EG_FALLBACK, Date.parse(iso))).toBe(open);
  });

  it.each([
    ["2026-10-14T13:30:00Z", true],   // 09:30 EDT
    ["2026-11-04T13:30:00Z", false],  // 08:30 EST — DST ended
    ["2026-11-04T14:30:00Z", true],   // 09:30 EST
    ["2026-11-26T15:00:00Z", false],  // holiday from the list
  ])("US at %s -> %s", (iso, open) => {
    expect(isMarketOpen(US, Date.parse(iso))).toBe(open);
  });
});

describe("formatMoney", () => {
  it("appends the market's code", () => {
    expect(formatMoney(2540, "EGP")).toBe("2,540.00 EGP");
    expect(formatPrice(189.5, "USD")).toBe("189.50 USD");
    expect(formatMoney(1234.5, "USD", { digits: 0, withCode: false })).toBe("1,235");
  });
});

describe("withMarket", () => {
  afterEach(() => setApiMarket("EG"));

  it("adds the current market to data routes", () => {
    setApiMarket("US");
    expect(withMarket("/api/portfolio")).toBe("/api/portfolio?market=US");
    expect(withMarket("/api/analysis?symbol=COMI")).toBe("/api/analysis?symbol=COMI&market=US");
  });

  it("leaves auth, settings and markets routes alone", () => {
    expect(withMarket("/api/auth/me")).toBe("/api/auth/me");
    expect(withMarket("/api/settings?section=market")).toBe("/api/settings?section=market");
    expect(withMarket("/api/markets")).toBe("/api/markets");
  });

  it("honours an explicit override and null", () => {
    expect(withMarket("/api/analysis?symbol=COMI", "EG")).toBe("/api/analysis?symbol=COMI&market=EG");
    expect(withMarket("/api/analysis?symbol=COMI", null)).toBe("/api/analysis?symbol=COMI");
  });
});
