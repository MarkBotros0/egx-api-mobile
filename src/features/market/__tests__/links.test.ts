import { stockDetailHref } from "../links";

describe("stockDetailHref", () => {
  it("opens the stock on the interval its card was scored on", () => {
    expect(stockDetailHref("COMI", "Weekly")).toEqual({
      pathname: "/stock/[symbol]",
      params: { symbol: "COMI", interval: "Weekly" },
    });
  });
  it("omits the interval when there is none", () => {
    expect(stockDetailHref("COMI")).toEqual({
      pathname: "/stock/[symbol]",
      params: { symbol: "COMI" },
    });
  });
  it("upper-cases the symbol like stockHref", () => {
    expect(stockDetailHref("comi", "Daily")).toEqual({
      pathname: "/stock/[symbol]",
      params: { symbol: "COMI", interval: "Daily" },
    });
  });
});
