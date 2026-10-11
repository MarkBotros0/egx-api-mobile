import { macroData, metrics } from "@/features/portfolio/testing/fixtures";
import {
  currentDrawdownTone,
  directionArrow,
  diversificationTone,
  drawdownTone,
  excludedNotice,
  formatMacroValue,
  macroDetails,
  sharpeTone,
  sortinoTone,
} from "../display";

describe("risk tones", () => {
  it("bands the Sharpe ratio against the constants", () => {
    expect(sharpeTone(null)).toBe("text-white/30");
    expect(sharpeTone(1.2)).toBe("text-gain");
    expect(sharpeTone(0.7)).toBe("text-green-400");
    expect(sharpeTone(0.2)).toBe("text-yellow-400");
    expect(sharpeTone(-0.1)).toBe("text-loss");
    expect(sortinoTone(0.7)).toBe("text-yellow-400");
  });

  it("bands drawdowns (negative fractions)", () => {
    expect(drawdownTone(-0.05)).toBe("text-gain");
    expect(drawdownTone(-0.15)).toBe("text-yellow-400");
    expect(drawdownTone(-0.3)).toBe("text-loss");
    expect(currentDrawdownTone(0)).toBe("text-gain");
    expect(currentDrawdownTone(-0.03)).toBe("text-yellow-400");
    expect(currentDrawdownTone(-0.08)).toBe("text-loss");
    expect(diversificationTone(70)).toBe("text-gain");
    expect(diversificationTone(40)).toBe("text-yellow-400");
    expect(diversificationTone(39)).toBe("text-loss");
  });
});

describe("macro", () => {
  it("colours by what 'up' means for each indicator", () => {
    expect(directionArrow("up")).toEqual({ glyph: "↑", className: "text-gain" });
    expect(directionArrow("up", { positiveIsGood: false })).toEqual({ glyph: "↑", className: "text-loss" });
    expect(directionArrow("down", { positiveIsGood: false })).toEqual({ glyph: "↓", className: "text-gain" });
    expect(directionArrow("down", { neutral: true })).toEqual({ glyph: "↓", className: "text-white/40" });
    expect(directionArrow(null)).toEqual({ glyph: "→", className: "text-white/30" });
  });

  it("explains each reading", () => {
    expect(macroDetails(macroData())).toEqual({
      rate: "Moderate rates favor stock investing",
      fx: "Strengthening EGP benefits importers",
      egx30: "+2.1% this month",
    });
    expect(macroDetails(macroData({ interest_rate: { value: 21, direction: "up" } })).rate).toBe(
      "High rates make T-bills attractive vs stocks",
    );
    // A flat month is real data, not "unavailable".
    expect(macroDetails(macroData({ egx30: { value: 31000, direction: null, monthly_change_pct: 0 } })).egx30).toBe(
      "0.0% this month",
    );
  });

  it("groups index-sized values only", () => {
    expect(formatMacroValue(31000.4)).toBe("31,000");
    expect(formatMacroValue(48.5)).toBe("48.5");
  });
});

describe("excludedNotice", () => {
  it("says what the totals leave out", () => {
    expect(excludedNotice(metrics())).toBeNull();
    expect(excludedNotice(metrics({ excluded_count: 1, excluded_invested: 0 }))).toBe(
      "1 holding could not be priced and is left out of these totals. The figures below describe the rest of your portfolio.",
    );
    expect(excludedNotice(metrics({ excluded_count: 2, excluded_invested: 5000 }))).toBe(
      "2 holdings could not be priced and are left out of these totals (5,000 EGP of cost basis). The figures below describe the rest of your portfolio.",
    );
  });
});
