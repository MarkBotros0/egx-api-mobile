import type { EntryExit, ZoneConfidence } from "@/shared/types";
import { zoneLabel, zonePill, zoneTone } from "../zones";

function ee(entry: ZoneConfidence | null, exit: ZoneConfidence | null): EntryExit {
  return {
    entry_zone: { active: entry !== null, confidence: entry, price_range: { low: 40, high: 42 }, suggested_stop_loss: 38.5, reasons: [] },
    exit_zone: { active: exit !== null, confidence: exit, price_range: { low: 55, high: 57 }, reasons: [] },
  };
}

describe("zone pill", () => {
  it("prefers an active entry zone", () => {
    expect(zonePill(ee("high", "high"))?.kind).toBe("Entry");
    expect(zonePill(ee(null, "medium"))?.kind).toBe("Exit");
    expect(zonePill(ee(null, null))).toBeNull();
    expect(zonePill(null)).toBeNull();
  });

  it("only earns a direction at medium or high confidence", () => {
    expect(zoneTone(zonePill(ee("high", null))!)).toBe("gain");
    expect(zoneTone(zonePill(ee("medium", null))!)).toBe("gain");
    expect(zoneTone(zonePill(ee("low", null))!)).toBe("neutral");
    expect(zoneTone(zonePill(ee(null, "medium"))!)).toBe("loss");
    // Low-confidence EXIT goes neutral too (the web left its detail box red).
    expect(zoneTone(zonePill(ee(null, "low"))!)).toBe("neutral");
  });

  it("labels kind and confidence", () => {
    expect(zoneLabel(zonePill(ee("low", null))!)).toBe("Entry zone · low");
    expect(zoneLabel({ kind: "Exit", confidence: null, direction: "loss" })).toBe("Exit zone");
  });
});
