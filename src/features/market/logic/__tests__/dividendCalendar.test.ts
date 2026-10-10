import { CALENDAR } from "@/features/market/testing/fixtures";
import {
  dayTitle,
  daysInMonth,
  firstWeekday,
  indexCalendar,
  listedFor,
  monthCells,
  monthTitle,
  shiftMonth,
  viewFromIso,
  yearOptions,
} from "../dividendCalendar";

describe("month maths", () => {
  it("knows where a month starts and how long it is", () => {
    expect(firstWeekday(2026, 8)).toBe(2); // 1 Sep 2026 is a Tuesday
    expect(daysInMonth(2026, 8)).toBe(30);
    expect(daysInMonth(2028, 1)).toBe(29);
  });
  it("lays out a Sunday-first grid", () => {
    const cells = monthCells(2026, 8);
    expect(cells).toHaveLength(32);
    expect(cells.slice(0, 3)).toEqual([null, null, 1]);
    expect(cells[cells.length - 1]).toBe(30);
  });
  it("pages across year boundaries", () => {
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
  });
});

describe("indexing and listing", () => {
  const { byDate, years, latest } = indexCalendar(CALENDAR.stocks);
  it("indexes ex-dates and finds the latest month", () => {
    expect(byDate.get("2026-04-07")?.map((s) => s.symbol)).toEqual(["COMI", "ETEL"]);
    expect(years).toEqual([2026, 2025]);
    expect(latest).toBe("2026-04-20");
    expect(viewFromIso(latest)).toEqual({ y: 2026, m: 3 });
    expect(viewFromIso("")).toBeNull();
  });
  it("lists a whole month newest first, or one selected day", () => {
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 3 }, null).map((s) => s.symbol)).toEqual(["SWDY", "COMI", "ETEL"]);
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 3 }, "2026-04-07").map((s) => s.symbol)).toEqual(["COMI", "ETEL"]);
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 2 }, null)).toEqual([]);
  });
});

describe("labels", () => {
  it("names months and days", () => {
    expect(monthTitle({ y: 2026, m: 3 })).toBe("April 2026");
    expect(dayTitle("2026-04-07")).toBe("7 Apr 2026");
  });
  it("always offers the viewed year", () => {
    expect(yearOptions([2026, 2025], 2024)).toEqual([2024, 2026, 2025]);
    expect(yearOptions([2026, 2025], 2025)).toEqual([2026, 2025]);
  });
});
