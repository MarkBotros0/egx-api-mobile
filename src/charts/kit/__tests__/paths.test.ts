import { bandPath, linePath } from "../paths";

const moves = (d: string | null) => (d?.match(/M/g) ?? []).length;

describe("linePath", () => {
  it("draws a straight line with the linear curve", () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }], { curve: "linear" })).toBe("M0,0L10,10");
  });

  it("breaks the line at a null when connectNulls is off", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: null }, { x: 20, y: 5 }, { x: 30, y: 6 }];
    expect(moves(linePath(pts))).toBe(2);
  });

  it("bridges a null when connectNulls is on", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: null }, { x: 20, y: 5 }];
    expect(moves(linePath(pts, { connectNulls: true }))).toBe(1);
  });

  it("returns null when nothing is defined", () => {
    expect(linePath([{ x: 0, y: null }, { x: 10, y: null }])).toBeNull();
    expect(linePath([])).toBeNull();
  });
});

describe("bandPath", () => {
  it("fills between the two series", () => {
    expect(bandPath([0, 10], [5, 5], [1, 1], { curve: "linear" })).toBe("M0,1L10,1L10,5L0,5Z");
  });

  it("returns null when no index has both ends", () => {
    expect(bandPath([0, 10], [null, 5], [1, null])).toBeNull();
  });

  it("bridges a missing index when connectNulls is on", () => {
    const d = bandPath([0, 10, 20], [5, null, 5], [1, null, 1], { curve: "linear", connectNulls: true });
    expect(moves(d)).toBe(1);
  });
});
