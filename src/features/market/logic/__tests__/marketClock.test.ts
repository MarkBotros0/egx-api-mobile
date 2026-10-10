import {
  agoLabel,
  cardStamp,
  changeIntervalNote,
  isEgxOpen,
  isTodaysSession,
  localDateKey,
  sessionLabel,
} from "../marketClock";

describe("sessionLabel", () => {
  it("formats a bare ISO date as day + short month", () => {
    expect(sessionLabel("2026-09-02")).toBe("2 Sep");
  });
  it("reads the date part of a timestamp without shifting the day", () => {
    expect(sessionLabel("2026-12-31T22:33:28Z")).toBe("31 Dec");
  });
  it("returns null for empty or malformed input", () => {
    expect(sessionLabel(null)).toBeNull();
    expect(sessionLabel(undefined)).toBeNull();
    expect(sessionLabel("")).toBeNull();
    expect(sessionLabel("Sep 2")).toBeNull();
    expect(sessionLabel("2026-13-01")).toBeNull();
  });
});

describe("isTodaysSession", () => {
  const now = new Date(2026, 8, 3, 11, 0); // 3 Sep 2026, local time
  it("is true for today's local date", () => {
    expect(localDateKey(now)).toBe("2026-09-03");
    expect(isTodaysSession("2026-09-03", now)).toBe(true);
  });
  it("is false for a past session and for no date", () => {
    expect(isTodaysSession("2026-09-02", now)).toBe(false);
    expect(isTodaysSession(null, now)).toBe(false);
  });
  it("compares only the date part", () => {
    expect(isTodaysSession("2026-09-03T00:00:00Z", now)).toBe(true);
  });
});

describe("agoLabel", () => {
  const now = 1_800_000_000_000;
  it("is null without a fetch time", () => {
    expect(agoLabel(undefined, now)).toBeNull();
  });
  it("steps up its unit as the age grows", () => {
    expect(agoLabel(now - 14_000, now)).toBe("14s ago");
    expect(agoLabel(now - (3 * 60 + 14) * 1000, now)).toBe("3m 14s ago");
    expect(agoLabel(now - (18 * 3600 + 22 * 60) * 1000, now)).toBe("18h 22m ago");
    expect(agoLabel(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
  it("never shows a negative age", () => {
    expect(agoLabel(now + 5000, now)).toBe("0s ago");
  });
});

describe("isEgxOpen (Sun–Thu, 10:00–14:30 Cairo)", () => {
  it.each([
    ["2026-10-11T07:00:00Z", true], // Sun 10:00 Cairo, summer time (UTC+3)
    ["2026-10-11T06:59:00Z", false], // Sun 09:59
    ["2026-10-11T11:30:00Z", true], // Sun 14:30, the bell itself
    ["2026-10-11T11:31:00Z", false], // Sun 14:31
    ["2026-12-13T12:30:00Z", true], // Sun 14:30 Cairo in winter (UTC+2)
    ["2026-12-13T12:31:00Z", false],
    ["2026-10-09T09:00:00Z", false], // Friday
    ["2026-10-10T09:00:00Z", false], // Saturday
  ])("%s → open=%s", (iso, open) => {
    expect(isEgxOpen(Date.parse(iso))).toBe(open);
  });

  it("claims open when the engine cannot resolve Cairo time", () => {
    const spy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new RangeError("no time zone data");
    });
    expect(isEgxOpen(Date.parse("2026-10-10T09:00:00Z"))).toBe(true);
    spy.mockRestore();
  });
});

describe("cardStamp", () => {
  it("calls a past session a close and appends the fetch age", () => {
    expect(
      cardStamp({ asOf: "2 Sep", isToday: false, fetchedAgo: "14s ago", marketClosed: false })
    ).toBe("2 Sep close · 14s ago");
  });
  it("does not call today's moving bar a close while the market is open", () => {
    expect(
      cardStamp({ asOf: "3 Sep", isToday: true, fetchedAgo: "14s ago", marketClosed: false })
    ).toBe("3 Sep · 14s ago");
  });
  it("replaces the climbing age with Market closed once the bell has rung", () => {
    expect(
      cardStamp({ asOf: "3 Sep", isToday: true, fetchedAgo: "2h 5m ago", marketClosed: true })
    ).toBe("3 Sep close · Market closed");
    expect(
      cardStamp({ asOf: null, isToday: false, fetchedAgo: null, marketClosed: true })
    ).toBe("Market closed");
  });
  it("is null when there is nothing to say", () => {
    expect(
      cardStamp({ asOf: null, isToday: false, fetchedAgo: null, marketClosed: false })
    ).toBeNull();
  });
  it("shows the session alone when there is no fetch time", () => {
    expect(
      cardStamp({ asOf: "2 Sep", isToday: false, fetchedAgo: null, marketClosed: false })
    ).toBe("2 Sep close");
  });
});

describe("changeIntervalNote", () => {
  it("says what a non-daily change is measured against", () => {
    expect(changeIntervalNote("Weekly")).toBe("vs last week");
    expect(changeIntervalNote("Monthly")).toBe("vs last month");
    expect(changeIntervalNote("Daily")).toBeNull();
    expect(changeIntervalNote(undefined)).toBeNull();
  });
});
