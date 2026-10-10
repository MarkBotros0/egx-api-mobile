import {
  computeDomain,
  finiteOrNull,
  makeYScale,
  nearestIndex,
  xPositions,
  xTickIndices,
} from "../scales";

describe("finiteOrNull", () => {
  it("keeps finite numbers and nulls everything else", () => {
    expect(finiteOrNull(3)).toBe(3);
    expect(finiteOrNull(0)).toBe(0);
    expect(finiteOrNull(null)).toBeNull();
    expect(finiteOrNull(undefined)).toBeNull();
    expect(finiteOrNull(NaN)).toBeNull();
    expect(finiteOrNull(Infinity)).toBeNull();
    expect(finiteOrNull("3")).toBeNull();
  });
});

describe("computeDomain", () => {
  it("computeDomain ignores non-finite values", () => {
    expect(computeDomain([[1, null, 3, NaN, undefined, Infinity]])).toEqual([1, 3]);
  });

  it("spans every set", () => {
    expect(computeDomain([[1, 2], [-4, 0]])).toEqual([-4, 2]);
  });

  it("stretches to include extra values", () => {
    expect(computeDomain([[1, 3]], { include: [10] })).toEqual([1, 10]);
  });

  it("pins fixed ends", () => {
    expect(computeDomain([[20, 80]], { min: 0, max: 100 })).toEqual([0, 100]);
    expect(computeDomain([[5, 9]], { min: 0 })).toEqual([0, 9]);
  });

  it("falls back to [0, 1] with no data", () => {
    expect(computeDomain([])).toEqual([0, 1]);
    expect(computeDomain([[null, NaN]])).toEqual([0, 1]);
  });

  it("pads an all-equal series so it is not a zero-height domain", () => {
    expect(computeDomain([[5, 5, 5]])).toEqual([4.95, 5.05]);
    expect(computeDomain([[0, 0]])).toEqual([-1, 1]);
  });

  it("never returns an inverted domain", () => {
    const [lo, hi] = computeDomain([[-5, -2]], { min: 0 });
    expect(lo).toBe(0);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("makeYScale", () => {
  it("puts the domain minimum at the bottom and the maximum at the top", () => {
    const y = makeYScale([0, 100], 10, 110);
    expect(y(0)).toBe(110);
    expect(y(100)).toBe(10);
  });

  it("rounds an auto domain out to nice values", () => {
    expect(makeYScale([3.2, 97.1], 0, 100).domain()).toEqual([0, 100]);
  });
});

describe("xPositions", () => {
  it("spreads points edge to edge", () => {
    expect(xPositions(3, 0, 100, "point")).toEqual({ xs: [0, 50, 100], step: 50 });
  });

  it("centres a single point", () => {
    expect(xPositions(1, 0, 100, "point").xs).toEqual([50]);
  });

  it("returns nothing for no points", () => {
    expect(xPositions(0, 0, 100, "point")).toEqual({ xs: [], step: 0 });
  });

  it("centres bars in equal bands", () => {
    expect(xPositions(4, 0, 100, "band")).toEqual({ xs: [12.5, 37.5, 62.5, 87.5], step: 25 });
  });

  it("collapses instead of going negative when right < left", () => {
    expect(xPositions(3, 40, 10, "point").xs).toEqual([40, 40, 40]);
  });
});

describe("xTickIndices (Recharts preserveStartEnd + minTickGap)", () => {
  const xs = Array.from({ length: 11 }, (_, i) => i * 10); // 0..100

  it("keeps first and last and fills the middle at least minGap apart", () => {
    expect(xTickIndices(xs, 30)).toEqual([0, 3, 6, 10]);
  });

  it("handles one and zero points", () => {
    expect(xTickIndices([5], 30)).toEqual([0]);
    expect(xTickIndices([], 30)).toEqual([]);
  });
});

describe("nearestIndex", () => {
  const xs = [0, 10, 20];

  it("snaps to the closest x", () => {
    expect(nearestIndex(xs, 14)).toBe(1);
    expect(nearestIndex(xs, 16)).toBe(2);
    expect(nearestIndex(xs, 5)).toBe(0);
  });

  it("clamps outside the range", () => {
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 99)).toBe(2);
  });

  it("returns -1 with no points", () => {
    expect(nearestIndex([], 10)).toBe(-1);
  });
});
