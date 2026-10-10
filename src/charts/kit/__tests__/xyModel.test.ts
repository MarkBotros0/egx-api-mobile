import {
  buildXYModel,
  type BarsMark,
  type LineMark,
  type XYModel,
  type XYModelInput,
  type XYSeries,
} from "../xyModel";

const FRAME = { width: 340, height: 200, yAxisWidth: 40, xAxisHeight: 18, xMinTickGap: 60 };
// plot box for FRAME: left 40, right 336, top 8, bottom 182

function model(labels: string[], series: XYSeries[], extra: Partial<XYModelInput> = {}): XYModel {
  return buildXYModel({ labels, series, ...FRAME, ...extra });
}
const line = (m: XYModel, id: string) => m.marks.find((k) => k.id === id) as LineMark;
const bars = (m: XYModel, id: string) => m.marks.find((k) => k.id === id) as BarsMark;
const allPaths = (m: XYModel) => m.marks.map((k) => ("d" in k ? k.d ?? "" : "")).join(" ");

describe("buildXYModel", () => {
  it("spreads line points across the plot box", () => {
    const m = model(["a", "b", "c"], [{ kind: "line", id: "c", name: "C", values: [1, 2, 3], color: "#fff" }]);
    expect(m.plot).toEqual({ left: 40, right: 336, top: 8, bottom: 182 });
    expect(m.xs).toEqual([40, 188, 336]);
    expect(line(m, "c").d?.startsWith("M40,")).toBe(true);
    const [p0, , p2] = line(m, "c").points;
    expect(p2!).toBeLessThan(p0!); // higher value sits higher on screen
  });

  it("keeps declaration order as draw order", () => {
    const m = model(["a", "b"], [
      { kind: "band", id: "band", lower: [1, 1], upper: [2, 2], fill: "#000" },
      { kind: "line", id: "close", name: "Close", values: [1, 2], color: "#fff" },
    ]);
    expect(m.marks.map((k) => k.id)).toEqual(["band", "close"]);
  });

  it("treats NaN and missing trailing values as gaps", () => {
    const m = model(["a", "b", "c", "d"], [
      { kind: "line", id: "s", name: "S", values: [1, NaN, 3], color: "#fff" },
    ]);
    expect(line(m, "s").points[1]).toBeNull();
    expect(line(m, "s").points[3]).toBeNull();
    expect(allPaths(m)).not.toContain("NaN");
  });

  it("ignores values beyond the last label", () => {
    const m = model(["a", "b"], [{ kind: "line", id: "s", name: "S", values: [1, 2, 999], color: "#fff" }]);
    expect(m.domain[1]).toBeLessThan(999);
  });

  it("draws a single point in the middle of the plot", () => {
    const m = model(["a"], [{ kind: "line", id: "s", name: "S", values: [5], color: "#fff" }]);
    expect(m.xs).toEqual([188]);
    expect(line(m, "s").d?.startsWith("M188,")).toBe(true);
  });

  it("gives an all-equal series a real domain and keeps it inside the plot", () => {
    const m = model(["a", "b", "c"], [{ kind: "line", id: "s", name: "S", values: [5, 5, 5], color: "#fff" }]);
    expect(m.domain[0]).toBeLessThan(5);
    expect(m.domain[1]).toBeGreaterThan(5);
    for (const y of line(m, "s").points) {
      expect(y!).toBeGreaterThanOrEqual(8);
      expect(y!).toBeLessThanOrEqual(182);
    }
  });

  it("produces nothing to draw for no labels", () => {
    const m = model([], [{ kind: "line", id: "s", name: "S", values: [], color: "#fff" }]);
    expect(m.xs).toEqual([]);
    expect(line(m, "s").d).toBeNull();
    expect(m.xTicks).toEqual([]);
  });

  it("never emits NaN at a width narrower than the axis", () => {
    const m = model(["a", "b", "c"], [
      { kind: "line", id: "s", name: "S", values: [1, 2, 3], color: "#fff" },
      { kind: "band", id: "b", lower: [0, 1, 2], upper: [2, 3, 4], fill: "#000" },
    ], { width: 10, height: 12 });
    expect(allPaths(m)).not.toContain("NaN");
  });

  it("extends the domain to a reference line that asks for it", () => {
    const m = model(["a", "b"], [{ kind: "line", id: "s", name: "S", values: [100, 110], color: "#fff" }], {
      refLines: [{ id: "far", y: 60, color: "#0f0", extendDomain: true }],
    });
    expect(m.domain[0]).toBeLessThanOrEqual(60);
    expect(m.refLines.map((r) => r.id)).toEqual(["far"]);
    expect(m.refLines[0].py).toBeLessThanOrEqual(182);
  });

  it("drops a plain reference line outside the domain (Recharts discards it)", () => {
    const m = model(["a", "b"], [{ kind: "line", id: "s", name: "S", values: [100, 110], color: "#fff" }], {
      refLines: [{ id: "zero", y: 0, color: "#fff" }],
    });
    expect(m.refLines).toEqual([]);
  });

  it("uses a fixed domain and explicit ticks", () => {
    const m = model(["a", "b"], [{ kind: "line", id: "rsi", name: "RSI", values: [40, 60], color: "#fff" }], {
      yDomain: { min: 0, max: 100 },
      yTicks: [0, 30, 50, 70, 100],
    });
    expect(m.domain).toEqual([0, 100]);
    expect(m.yTicks.map((t) => t.value)).toEqual([0, 30, 50, 70, 100]);
    expect(m.yTicks[0].y).toBe(182);
    expect(m.yTicks[4].y).toBe(8);
  });

  it("lays bars out in bands, always includes zero and hangs negatives below it", () => {
    const m = model(["a", "b"], [
      { kind: "bars", id: "h", name: "H", values: [2, -1], colorAt: (v) => (v >= 0 ? "up" : "down") },
    ]);
    expect(m.xs).toEqual([114, 262]);
    expect(m.domain[0]).toBeLessThanOrEqual(-1);
    const [up, down] = bars(m, "h").rects;
    expect(up.color).toBe("up");
    expect(down.color).toBe("down");
    expect(up.y + up.h).toBeCloseTo(down.y, 5); // both meet at the zero line
    expect(up.w).toBeCloseTo(148 * 0.8, 5);
  });

  it("skips bars with no value", () => {
    const m = model(["a", "b"], [{ kind: "bars", id: "v", name: "V", values: [null, 5], colorAt: () => "c" }]);
    expect(bars(m, "v").rects.map((r) => r.index)).toEqual([1]);
  });

  it("puts anchor dots only on anchor bars that have a value", () => {
    const m = model(["a", "b", "c", "d"], [
      { kind: "line", id: "t", name: "T", values: [null, 2, 3, 4], color: "#0f0", curve: "linear", anchorIndices: [0, 1, 3, 9] },
    ]);
    expect(line(m, "t").anchors).toHaveLength(2);
    expect(line(m, "t").anchors[0].x).toBe(m.xs[1]);
  });

  it("thins x ticks to the minimum gap, keeping both ends", () => {
    const labels = Array.from({ length: 30 }, (_, i) => `d${i}`);
    const m = model(labels, [{ kind: "line", id: "s", name: "S", values: labels.map((_, i) => i), color: "#fff" }]);
    const idx = m.xTicks.map((t) => t.index);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(29);
    for (let i = 1; i < idx.length - 1; i++) {
      expect(m.xTicks[i].x - m.xTicks[i - 1].x).toBeGreaterThanOrEqual(60);
    }
    expect(m.xTicks[0].label).toBe("d0");
  });
});
