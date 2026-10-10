// d3-scale and d3-shape ship ESM only ("type": "module"). This test exists to
// prove Jest transforms them; it fails with "Cannot use import statement
// outside a module" when jest.config.js stops listing them.
import { scaleLinear } from "d3-scale";
import { curveLinear, line } from "d3-shape";

describe("d3 under Jest", () => {
  it("d3-scale maps a domain onto a range", () => {
    const y = scaleLinear().domain([0, 10]).range([100, 0]);
    expect(y(5)).toBe(50);
  });

  it("d3-shape builds an SVG path", () => {
    const d = line<[number, number]>().curve(curveLinear)([
      [0, 0],
      [10, 10],
    ]);
    expect(d).toBe("M0,0L10,10");
  });
});
