import {
  dateToIso,
  egp,
  egp2,
  errorMessage,
  fmtExDate,
  isoToDate,
  pnlTone,
  signed,
  signedPct,
  todayIso,
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
  it("uses the LOCAL calendar day, not UTC (01:30 in Cairo is still today)", () => {
    // The web used toISOString().slice(0, 10), which is the UTC day: between
    // midnight and 02:00/03:00 Cairo it defaulted every date field to yesterday.
    expect(todayIso(new Date(2026, 9, 10, 1, 30))).toBe("2026-10-10");
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("round-trips ISO dates through local midnight", () => {
    const d = isoToDate("2026-06-01");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(1);
    expect(dateToIso(d as Date)).toBe("2026-06-01");
    expect(isoToDate("01/06/2026")).toBeNull();
  });

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
