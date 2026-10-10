import { area, curveLinear, curveMonotoneX, line, type CurveFactory } from "d3-shape";

export type Curve = "monotone" | "linear";

export interface Pt {
  x: number;
  /** Pixel y, or null for "no value at this bar". */
  y: number | null;
}

const CURVES: Record<Curve, CurveFactory> = {
  monotone: curveMonotoneX, // Recharts type="monotone"
  linear: curveLinear, // Recharts type="linear" — trendlines must stay straight
};

/**
 * SVG path for a line. connectNulls=false leaves a gap at every null (Recharts
 * default); connectNulls=true draws straight through them. Null when there is
 * nothing to draw.
 */
export function linePath(
  points: readonly Pt[],
  opts: { curve?: Curve; connectNulls?: boolean } = {},
): string | null {
  const pts = opts.connectNulls ? points.filter((p) => p.y !== null) : points;
  const d = line<Pt>()
    .x((p) => p.x)
    .y((p) => p.y as number)
    .defined((p) => p.y !== null)
    .curve(CURVES[opts.curve ?? "monotone"])(pts);
  return d ? d : null;
}

interface BandPt {
  x: number;
  y0: number | null;
  y1: number | null;
}

/**
 * Filled region between two pixel series (Bollinger envelope, Monte Carlo
 * fan). Drawn directly between the series — the web's "paint from the floor,
 * then erase below the lower series" trick is not needed here.
 */
export function bandPath(
  xs: readonly number[],
  lower: readonly (number | null)[],
  upper: readonly (number | null)[],
  opts: { curve?: Curve; connectNulls?: boolean } = {},
): string | null {
  let pts: BandPt[] = xs.map((x, i) => ({ x, y0: lower[i] ?? null, y1: upper[i] ?? null }));
  if (opts.connectNulls) pts = pts.filter((p) => p.y0 !== null && p.y1 !== null);
  const d = area<BandPt>()
    .x((p) => p.x)
    .y0((p) => p.y0 as number)
    .y1((p) => p.y1 as number)
    .defined((p) => p.y0 !== null && p.y1 !== null)
    .curve(CURVES[opts.curve ?? "monotone"])(pts);
  return d ? d : null;
}
