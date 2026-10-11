import { formatLevelAge, levelReading, zoneTone } from "../levels";

describe("formatLevelAge", () => {
  it("says how old a level is in plain words", () => {
    expect(formatLevelAge(1)).toBe("touched today");
    expect(formatLevelAge(4)).toBe("4 days ago");
    expect(formatLevelAge(15)).toBe("~3 weeks ago");
    expect(formatLevelAge(63)).toBe("~3 months ago");
    expect(formatLevelAge(300)).toBe("over a year ago");
  });
});

describe("levelReading", () => {
  it("describes an intact support below price", () => {
    expect(levelReading("support", { price: 80, distance_pct: -3.03, strength: 3, bars_ago: 4 }, 82.5)).toEqual({
      label: "Nearest Support",
      priceText: "80.00 EGP",
      brokenThrough: false,
      directionText: "3.0% below current",
      strengthText: "Tested 3x · 4 days ago",
    });
  });
  it("calls a one-touch level weak and a crossed level broken", () => {
    const r = levelReading("resistance", { price: 80, distance_pct: -3.03, strength: 1, bars_ago: null }, 82.5);
    expect(r.brokenThrough).toBe(true);
    expect(r.directionText).toBe("3.0% below current — broken");
    expect(r.strengthText).toBe("Touched once — weak level");
    const s = levelReading("support", { price: 85, distance_pct: 3.03, strength: 2 }, 82.5);
    expect(s.directionText).toBe("3.0% above current — broken");
  });
});

describe("zoneTone", () => {
  it("colours a strong entry gain and a strong exit loss — never green on a sell cue", () => {
    expect(zoneTone("entry", "high")).toMatchObject({ strong: true, textClass: "text-gain" });
    expect(zoneTone("exit", "high")).toMatchObject({ strong: true, textClass: "text-loss" });
    expect(zoneTone("exit", "high").badge).toEqual({ label: "High confidence", boxClass: "bg-loss/20 border-loss/30", textClass: "text-loss" });
    expect(zoneTone("exit", "medium").badge?.textClass).toBe("text-[#ffaa00]");
  });
  it("keeps a low-confidence zone neutral", () => {
    expect(zoneTone("entry", "low")).toMatchObject({ strong: false, textClass: "text-white/70", boxClass: "border-white/10 bg-white/[0.02]" });
    expect(zoneTone("exit", null).badge).toBeNull();
  });
});
