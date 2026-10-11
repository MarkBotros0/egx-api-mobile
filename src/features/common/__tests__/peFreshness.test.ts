import { peStalenessMessage } from "../peFreshness";

describe("peStalenessMessage", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");

  it("is silent while the feed is under 48 hours old or unknown", () => {
    expect(peStalenessMessage({ last_successful_fetch: "2026-10-09T00:00:00Z", last_attempt_status: "ok" }, now)).toBeNull();
    expect(peStalenessMessage(null, now)).toBeNull();
    expect(peStalenessMessage({ last_successful_fetch: null, last_attempt_status: "error" }, now)).toBeNull();
  });

  it("states the age and the failed attempt", () => {
    expect(
      peStalenessMessage({ last_successful_fetch: "2026-10-07T11:00:00Z", last_attempt_status: "timeout" }, now),
    ).toBe("P/E data last updated 3 days ago — the EGX feed may be temporarily unavailable. Last attempt: timeout.");
  });
});
