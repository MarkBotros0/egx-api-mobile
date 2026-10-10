import { formatCompact, formatTick } from "../format";
import { withAlpha } from "../palette";

describe("withAlpha", () => {
  it("turns a #rrggbb hex into rgba", () => {
    expect(withAlpha("#00ff88", 0.5)).toBe("rgba(0,255,136,0.5)");
    expect(withAlpha("#ff3355", 0.4)).toBe("rgba(255,51,85,0.4)");
  });

  it("returns anything that is not #rrggbb unchanged", () => {
    expect(withAlpha("rgba(1,2,3,0.5)", 0.2)).toBe("rgba(1,2,3,0.5)");
  });
});

describe("formatCompact (web VolumeChart / OBV / Monte Carlo axis)", () => {
  it("uses M with one decimal from a million", () => {
    expect(formatCompact(1_500_000)).toBe("1.5M");
    expect(formatCompact(-2_000_000)).toBe("-2.0M");
  });

  it("uses K with no decimals from a thousand", () => {
    expect(formatCompact(12_000)).toBe("12K");
    expect(formatCompact(-1_200)).toBe("-1K");
  });

  it("prints small values as they are", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(0)).toBe("0");
  });
});

describe("formatTick", () => {
  it("prints integers bare and trims float noise", () => {
    expect(formatTick(40)).toBe("40");
    expect(formatTick(0.1 + 0.2)).toBe("0.3");
    expect(formatTick(42.5)).toBe("42.5");
  });
});
