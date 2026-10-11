import {
  egp,
  egp2,
  errorMessage,
  fmtExDate,
  pnlTone,
  signed,
  signedPct,
} from "../format";

describe("money formatting", () => {
  it("groups thousands with Latin digits and caps decimals", () => {
    expect(egp(12720)).toBe("12,720");
    expect(egp(2539.99999, 2)).toBe("2,540");
    expect(egp(1234.5678, 2)).toBe("1,234.57");
  });

  it("always shows two decimals for totals", () => {
    expect(egp2(15600)).toBe("15,600.00");
  });

  it("signs gains and losses", () => {
    expect(signed(2540)).toBe("+2,540");
    expect(signed(-600)).toBe("-600");
    expect(signed(0)).toBe("+0");
    expect(signedPct(24.2829, 2)).toBe("+24.28%");
    expect(signedPct(-3.25)).toBe("-3.3%");
  });

  it("colours by direction only", () => {
    expect(pnlTone(1)).toBe("text-gain");
    expect(pnlTone(0)).toBe("text-gain");
    expect(pnlTone(-0.01)).toBe("text-loss");
  });
});

describe("dates", () => {
  it("formats the market ex-date like the web", () => {
    expect(fmtExDate("2026-04-07")).toBe("7 Apr 2026");
    expect(fmtExDate("garbage")).toBe("garbage");
  });
});

describe("errorMessage", () => {
  it("prefers the thrown message", () => {
    expect(errorMessage(new Error("Holding not found: x"))).toBe("Holding not found: x");
    expect(errorMessage("nope")).toBe("Something went wrong");
    expect(errorMessage(undefined, "Could not load")).toBe("Could not load");
  });
});
