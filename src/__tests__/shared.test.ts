import { scoreBand } from "@/shared/constants";
import { planSale } from "@/shared/positions";
import { COLORS } from "@/shared/theme";

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
