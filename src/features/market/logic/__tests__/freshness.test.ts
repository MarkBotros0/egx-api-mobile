import { peStaleDays, riskAgoLabel } from "../freshness";

const now = Date.parse("2026-10-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

describe("peStaleDays", () => {
  it("is null while the feed is under 48 hours old", () => {
    expect(peStaleDays(hoursAgo(47), now)).toBeNull();
    expect(peStaleDays(null, now)).toBeNull();
    expect(peStaleDays("garbage", now)).toBeNull();
  });
  it("counts whole days once stale", () => {
    expect(peStaleDays(hoursAgo(48), now)).toBe(2);
    expect(peStaleDays(hoursAgo(84), now)).toBe(3);
  });
});

describe("riskAgoLabel", () => {
  it("says when the grade was measured", () => {
    expect(riskAgoLabel(hoursAgo(0.5), now)).toBe("just now");
    expect(riskAgoLabel(hoursAgo(5), now)).toBe("5h ago");
    expect(riskAgoLabel(hoursAgo(26), now)).toBe("yesterday");
    expect(riskAgoLabel(hoursAgo(72), now)).toBe("3 days ago");
    expect(riskAgoLabel(undefined, now)).toBeNull();
  });
});
