import { learnHref, routes, stockHref } from "@/lib/links";

describe("links", () => {
  it("builds stock routes with an encoded, upper-cased symbol", () => {
    expect(stockHref("comi")).toEqual({ pathname: "/stock/[symbol]", params: { symbol: "COMI" } });
  });

  it("deep-links Learn concepts through the concept param (web used #hash)", () => {
    expect(learnHref("rsi")).toEqual({ pathname: "/learn", params: { concept: "rsi" } });
    expect(learnHref()).toBe(routes.learn);
  });
});
