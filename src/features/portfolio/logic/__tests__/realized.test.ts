import { TWO_LOT_ORDER, dividend, order } from "@/features/portfolio/testing/fixtures";
import {
  companyName,
  heldLine,
  initialRealizedTab,
  removeDividendMessage,
  tBillLine,
  undoSaleMessage,
} from "../realized";

describe("initialRealizedTab", () => {
  it("opens the first non-empty ledger, sales first", () => {
    expect(initialRealizedTab([order()], [dividend()])).toBe("sales");
    expect(initialRealizedTab([], [dividend()])).toBe("dividends");
    expect(initialRealizedTab([], [])).toBe("by_symbol");
  });
});

describe("tBillLine", () => {
  it("states the annualized figure against the hurdle that applied", () => {
    expect(tBillLine(order())).toBe("+43.6%/yr — beat the 21% T-bill");
    expect(tBillLine(order({ annualized_return_pct: 12.04, beat_t_bill: false }))).toBe(
      "+12%/yr — lost to the 21% T-bill",
    );
  });

  it("explains a multi-purchase order instead of inventing one holding period", () => {
    expect(tBillLine(TWO_LOT_ORDER)).toBe("Spans 2 purchases — see each below");
  });

  it("says nothing for a single trade too short to annualize", () => {
    expect(tBillLine(order({ annualized_return_pct: null, beat_t_bill: null }))).toBeNull();
  });
});

describe("row copy", () => {
  it("shows the holding period, or the purchase date range when the parts differ", () => {
    expect(heldLine(order())).toBe("Held 184 days");
    expect(heldLine(TWO_LOT_ORDER)).toBe("Bought 2025-01-05 – 2025-05-10");
  });

  it("drops a company name that only echoes the ticker", () => {
    expect(companyName("COMI", "COMI")).toBeNull();
    expect(companyName("COMI", "")).toBeNull();
    expect(companyName("COMI", "Commercial International Bank")).toBe("Commercial International Bank");
  });

  it("says how many purchases an undo reaches", () => {
    expect(undoSaleMessage("SWDY", 2)).toBe(
      "The SWDY sale will be removed from your winnings and the shares returned to your portfolio, across all 2 purchases it sold from. If you deleted the holding itself, the shares cannot be restored.",
    );
    expect(undoSaleMessage("ETEL", 1)).not.toContain("across all");
    expect(removeDividendMessage("COMI")).toBe(
      "The COMI dividend will be removed from your winnings. Your holdings are not affected.",
    );
  });
});

describe("tBillLine on another market", () => {
  it("keeps one decimal of a ~4% T-bill rather than rounding it to a whole percent", () => {
    const o = order({ annualized_return_pct: 4.5, beat_t_bill: true, t_bill_hurdle_pct: 4.21 });
    expect(tBillLine(o, "US")).toBe("+4.5%/yr — beat the 4.2% T-bill");
    expect(tBillLine(o)).toBe("+4.5%/yr — beat the 4% T-bill");
  });
});
