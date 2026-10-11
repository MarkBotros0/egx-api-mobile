import { LOT_A, LOT_B, sale } from "@/features/portfolio/testing/fixtures";
import { buildDividendPayload, dividendSymbolOptions, perShareAmount, presetSharesText } from "../dividend";

describe("dividendSymbolOptions", () => {
  it("offers open holdings AND symbols already sold, sorted", () => {
    const options = dividendSymbolOptions([sale()], [LOT_A, LOT_B]);
    expect(options.map((o) => o.symbol)).toEqual(["COMI", "ETEL"]);
  });

  it("gives an open position its TOTAL shares across lots, and a sold-out one none", () => {
    const options = dividendSymbolOptions([sale()], [LOT_A, LOT_B]);
    expect(options.find((o) => o.symbol === "COMI")?.shares).toBe(300);
    expect(options.find((o) => o.symbol === "ETEL")?.shares).toBeNull();
    expect(presetSharesText(options, "COMI")).toBe("300");
    expect(presetSharesText(options, "ETEL")).toBe("");
  });

  it("lets an open holding win over its own sale history", () => {
    const options = dividendSymbolOptions([sale({ symbol: "COMI" })], [LOT_A]);
    expect(options).toEqual([{ symbol: "COMI", name: LOT_A.name, sector: "Banking", shares: 200 }]);
  });
});

describe("buildDividendPayload", () => {
  const options = dividendSymbolOptions([], [LOT_A, LOT_B]);
  const base = { symbol: "COMI", options, amountText: "1234.567", payDate: "2026-04-07", sharesText: "300", notes: "", today: "2026-10-10" };

  it("records the net amount to three decimals with the company name", () => {
    expect(buildDividendPayload(base)).toEqual({
      ok: true,
      payload: {
        symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
        amount: 1234.567, pay_date: "2026-04-07", shares: 300, notes: "",
      },
    });
  });

  it("treats blank shares as unknown, not zero", () => {
    const r = buildDividendPayload({ ...base, sharesText: "" });
    expect(r.ok && r.payload.shares).toBeNull();
  });

  it("refuses fractional shares and a future pay date", () => {
    expect(buildDividendPayload({ ...base, sharesText: "5.7", payDate: "2026-11-01" })).toEqual({
      ok: false,
      errors: {
        symbol: null,
        amount: null,
        shares: "Enter a whole number of shares",
        date: "The pay date cannot be in the future",
      },
    });
  });

  it("needs a stock", () => {
    const r = buildDividendPayload({ ...base, symbol: "" });
    expect(!r.ok && r.errors.symbol).toBe("Pick a stock");
  });
});

describe("perShareAmount", () => {
  it("divides only when both numbers are valid", () => {
    expect(perShareAmount("1200", "300")).toBe(4);
    expect(perShareAmount("1200", "")).toBeNull();
    expect(perShareAmount("", "300")).toBeNull();
    expect(perShareAmount("1200", "2.5")).toBeNull();
  });
});
