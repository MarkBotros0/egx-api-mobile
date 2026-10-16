import { LOT_A, LOT_B, TWO_LOT_ROWS } from "@/features/portfolio/testing/fixtures";
import { previewSale, sellDateError, sellPositionFor } from "../sale";

const position = sellPositionFor(TWO_LOT_ROWS, "COMI")!;

describe("sellPositionFor", () => {
  it("collects every open lot of the symbol, oldest first", () => {
    expect(sellPositionFor([LOT_B, LOT_A], "COMI")).toEqual({
      symbol: "COMI",
      name: "Commercial International Bank",
      lots: [
        { id: "lotA", quantity: 200, buy_price: 41, buy_date: "2026-01-10" },
        { id: "lotB", quantity: 100, buy_price: 45.2, buy_date: "2026-06-01" },
      ],
    });
  });

  it("is null when nothing is open (deleted while the sheet was open)", () => {
    expect(sellPositionFor([{ ...LOT_A, quantity: 0 }], "COMI")).toBeNull();
    expect(sellPositionFor(TWO_LOT_ROWS, "ETEL")).toBeNull();
    expect(sellPositionFor(TWO_LOT_ROWS, null)).toBeNull();
  });
});

describe("previewSale", () => {
  it("states the position: 300 shares at a cost-weighted 42.40", () => {
    const p = previewSale(position, "300", "");
    expect(p.held).toBe(300);
    expect(p.avgBuyPrice).toBeCloseTo(42.4, 10);
    expect(p.multiLot).toBe(true);
    expect(p.pnl).toBeNull();
  });

  it("sums the realized figure over the FIFO parts, not off the average (250 @ 52 = 2,540)", () => {
    const p = previewSale(position, "250", "52");
    expect(p.parts.map((x) => [x.id, x.quantity])).toEqual([["lotA", 200], ["lotB", 50]]);
    expect(p.parts[0].pnl).toBeCloseTo(2200, 6);
    expect(p.parts[1].pnl).toBeCloseTo(340, 6);
    expect(p.pnl).toBeCloseTo(2540, 6);
    // (52 - 42.40) * 250 would be 2,400 — the bug this guards against.
    expect(p.pnl).not.toBeCloseTo(2400, 0);
    expect(p.pnlPct).toBeCloseTo((2540 / 10460) * 100, 6);
  });

  it("moves the earliest sell date with the newest lot the sale reaches", () => {
    expect(previewSale(position, "150", "").earliestSellDate).toBe("2026-01-10");
    expect(previewSale(position, "250", "").earliestSellDate).toBe("2026-06-01");
    // No valid quantity yet: the oldest purchase bounds it.
    expect(previewSale(position, "", "").earliestSellDate).toBe("2026-01-10");
  });

  it("refuses more than is held", () => {
    const p = previewSale(position, "301", "52");
    expect(p.quantity).toEqual({ ok: false, error: "Enter between 1 and 300 shares" });
    expect(p.parts).toEqual([]);
    expect(p.pnl).toBeNull();
  });
});

describe("sellDateError", () => {
  it("accepts a date on or after the binding purchase, up to today", () => {
    expect(sellDateError("2026-06-01", "2026-06-01", "2026-10-10", true)).toBeNull();
    expect(sellDateError("2026-10-11", "2026-06-01", "2026-10-10", true)).toBe("The sell date cannot be in the future");
  });

  // Review Focus 2: a date valid for 150 shares becomes invalid at 250.
  it("names the newer purchase's date once the sale reaches into it", () => {
    const at150 = previewSale(position, "150", "52");
    const at250 = previewSale(position, "250", "52");
    expect(sellDateError("2026-03-01", at150.earliestSellDate, "2026-10-10", true)).toBeNull();
    expect(sellDateError("2026-03-01", at250.earliestSellDate, "2026-10-10", true)).toBe(
      "This sale reaches a purchase made on 2026-06-01 — sell on or after that date",
    );
  });

  it("uses the single-lot wording for one purchase", () => {
    expect(sellDateError("2026-01-01", "2026-01-10", "2026-10-10", false)).toBe(
      "Sell on or after the buy date (2026-01-10)",
    );
  });
});

describe("a fractional US position", () => {
  const position = {
    symbol: "AAPL",
    lots: [
      { id: "a", quantity: 0.1, buy_price: 200, buy_date: "2026-01-02" },
      { id: "b", quantity: 0.2, buy_price: 210, buy_date: "2026-02-02" },
    ],
  };
  const US_RULES = { shareDecimals: 6, priceDecimals: 4 };

  it("sells out exactly, FIFO, without float residue", () => {
    const p = previewSale(position as never, "0.3", "220", US_RULES);
    expect(p.held).toBe(0.3);
    expect(p.quantity).toEqual({ ok: true, value: 0.3 });
    expect(p.parts.map((x) => [x.id, x.quantity])).toEqual([["a", 0.1], ["b", 0.2]]);
    expect(p.pnl).toBeCloseTo(0.1 * 20 + 0.2 * 10, 9);
  });
});
