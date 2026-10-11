import { dateToIso, isoToDate, todayIso } from "../dates";

describe("local dates", () => {
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
});
