import type { StockOutcomeBand } from "@/shared/types";

export interface ConeGeometry {
  outer: string;
  inner: string;
  /** y of today's price — the dashed reference line. */
  refY: number;
  min: number;
  max: number;
}

const f = (n: number) => n.toFixed(1);

/**
 * SVG paths for the outcome cone (web ForecastCard's stacked Recharts areas).
 * Day 0 is today's price; each band is a closed polygon: its `hi` edge left to
 * right, then its `lo` edge back. There is deliberately no median line.
 */
export function coneGeometry(
  band: StockOutcomeBand,
  width: number,
  height: number,
  pad = 4
): ConeGeometry | null {
  const { bands, current_price, days } = band;
  if (!bands.length || days < 1 || width <= pad * 2 || height <= pad * 2) return null;
  const inner = bands[0];
  const outer = bands[bands.length - 1];
  const edge = (values: number[]) => [current_price, ...values.slice(0, days)];

  const all = [...edge(outer.lo), ...edge(outer.hi), ...edge(inner.lo), ...edge(inner.hi)].filter(Number.isFinite);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / days) * (width - pad * 2);
  const y = (v: number) => pad + ((max - v) / span) * (height - pad * 2);

  const path = (upper: number[], lower: number[]) => {
    const top = upper.map((v, i) => `${i === 0 ? "M" : "L"}${f(x(i))},${f(y(v))}`);
    const bottom = lower
      .map((v, i) => [i, v] as const)
      .reverse()
      .map(([i, v]) => `L${f(x(i))},${f(y(v))}`);
    return `${top.join(" ")} ${bottom.join(" ")} Z`;
  };

  return {
    outer: path(edge(outer.hi), edge(outer.lo)),
    inner: path(edge(inner.hi), edge(inner.lo)),
    refY: y(current_price),
    min,
    max,
  };
}
