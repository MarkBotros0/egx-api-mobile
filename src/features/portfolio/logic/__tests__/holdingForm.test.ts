import { TICKERS } from "@/features/portfolio/testing/fixtures";
import { buildHoldingPayload, filterTickers, findKnownTicker, initialTicker } from "../holdingForm";

const COMI = { symbol: "COMI", name: "Commercial International Bank", sector: "Banking" };

describe("ticker search", () => {
  it("matches symbol or company name, case-insensitively, capped", () => {
    expect(filterTickers(TICKERS, "tel").map((t) => t.symbol)).toEqual(["ETEL"]);
    expect(filterTickers(TICKERS, "elsewedy").map((t) => t.symbol)).toEqual(["SWDY"]);
    expect(filterTickers(TICKERS, "", 2)).toHaveLength(2);
    expect(filterTickers(TICKERS, "zzz")).toEqual([]);
  });

  it("resolves an exact symbol typed in any case", () => {
    expect(findKnownTicker(TICKERS, " comi ")?.symbol).toBe("COMI");
    expect(findKnownTicker(TICKERS, "COM")).toBeUndefined();
  });
});

describe("initialTicker (edit)", () => {
  it("uses the ticker list when it has the symbol", () => {
    expect(initialTicker(TICKERS, { symbol: "COMI" })).toEqual(COMI);
  });

  // Review Focus 5
  it("keeps the stored name and sector when the ticker list has not loaded", () => {
    expect(initialTicker([], { symbol: "COMI", name: "Commercial International Bank", sector: "Banking" })).toEqual(COMI);
    expect(initialTicker([], { symbol: "XYZQ" })).toEqual({ symbol: "XYZQ", name: "XYZQ", sector: "Unknown" });
    expect(initialTicker(TICKERS, undefined)).toBeNull();
  });
});

describe("buildHoldingPayload", () => {
  const base = { ticker: COMI, quantityText: "100", priceText: "27.697", buyDate: "2026-10-01", today: "2026-10-10" };

  it("builds the add payload with a three-decimal price and integer quantity", () => {
    expect(buildHoldingPayload(base)).toEqual({
      ok: true,
      payload: {
        symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
        buy_price: 27.697, buy_date: "2026-10-01", quantity: 100,
        target_price: null, stop_loss: null, notes: "",
      },
    });
  });

  it("carries target, stop and notes through an edit unchanged", () => {
    const result = buildHoldingPayload({
      ...base,
      initial: { symbol: "COMI", target_price: 60, stop_loss: 38, notes: "core position" },
    });
    expect(result.ok && result.payload).toMatchObject({ target_price: 60, stop_loss: 38, notes: "core position" });
  });

  it("reports each invalid field", () => {
    expect(buildHoldingPayload({ ...base, quantityText: "5.5", priceText: "1,2", buyDate: "2026-12-01" })).toEqual({
      ok: false,
      errors: {
        quantity: "Enter a whole number of shares",
        price: "Use a dot for decimals and no thousands separators",
        date: "The buy date cannot be in the future",
      },
    });
  });

  it("refuses without a resolved ticker", () => {
    expect(buildHoldingPayload({ ...base, ticker: null }).ok).toBe(false);
  });
});
