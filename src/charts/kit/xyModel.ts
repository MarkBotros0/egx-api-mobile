import { bandPath, linePath, type Curve } from "./paths";
import { computeDomain, finiteOrNull, makeYScale, xPositions, xTickIndices } from "./scales";

export type SeriesValues = readonly (number | null | undefined)[];

export interface LineSeries {
  kind: "line";
  id: string;
  /** Name shown in the readout. */
  name: string;
  values: SeriesValues;
  color: string;
  width?: number;
  dash?: string;
  curve?: Curve;
  connectNulls?: boolean;
  /** Bars that get a hollow dot (trendline anchors). */
  anchorIndices?: readonly number[];
  /** In the readout and the domain, but not drawn (Monte Carlo percentiles shown as bands). */
  hidden?: boolean;
  /** Dot on the line under the crosshair. Default true. */
  activeDot?: boolean;
  inReadout?: boolean;
}

export interface BarSeries {
  kind: "bars";
  id: string;
  name: string;
  values: SeriesValues;
  colorAt: (value: number, index: number) => string;
  inReadout?: boolean;
}

export interface BandSeries {
  kind: "band";
  id: string;
  lower: SeriesValues;
  upper: SeriesValues;
  fill: string;
  curve?: Curve;
  connectNulls?: boolean;
}

export type XYSeries = LineSeries | BarSeries | BandSeries;

export interface RefLine {
  id: string;
  y: number;
  color: string;
  dash?: string;
  width?: number;
  label?: string;
  labelSide?: "left" | "right";
  labelColor?: string;
  labelSize?: number;
  /**
   * Stretch the y-domain to keep this line visible (Recharts
   * ifOverflow="extendDomain"). Without it a line outside the domain is
   * dropped, as Recharts does by default.
   */
  extendDomain?: boolean;
}

export interface XYModelInput {
  labels: readonly string[];
  series: readonly XYSeries[];
  refLines?: readonly RefLine[];
  yDomain?: { min?: number; max?: number };
  yTicks?: readonly number[];
  width: number;
  height: number;
  yAxisWidth: number;
  xAxisHeight: number;
  xMinTickGap: number;
}

export interface LineMark {
  kind: "line";
  id: string;
  d: string | null;
  color: string;
  width: number;
  dash?: string;
  hidden: boolean;
  activeDot: boolean;
  /** Pixel y per bar, null where the series has no value. */
  points: (number | null)[];
  anchors: { x: number; y: number }[];
}

export interface BandMark {
  kind: "band";
  id: string;
  d: string | null;
  fill: string;
}

export interface BarRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface BarsMark {
  kind: "bars";
  id: string;
  rects: BarRect[];
}

export type Mark = LineMark | BandMark | BarsMark;

export interface PlotBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface XYModel {
  plot: PlotBox;
  xs: number[];
  domain: [number, number];
  yTicks: { value: number; y: number }[];
  xTicks: { index: number; x: number; label: string }[];
  marks: Mark[];
  refLines: (RefLine & { py: number })[];
}

const PAD_TOP = 8;
const PAD_RIGHT = 4;
const BAR_FILL = 0.8; // Recharts' default 10% category gap on each side

export function buildXYModel(input: XYModelInput): XYModel {
  const { labels, series, width, height, yAxisWidth, xAxisHeight, xMinTickGap } = input;
  const n = labels.length;
  const refLines = input.refLines ?? [];

  const plot: PlotBox = {
    left: yAxisWidth,
    right: Math.max(yAxisWidth, width - PAD_RIGHT),
    top: PAD_TOP,
    bottom: Math.max(PAD_TOP, height - xAxisHeight),
  };

  const hasBars = series.some((s) => s.kind === "bars");
  const { xs, step } = xPositions(n, plot.left, plot.right, hasBars ? "band" : "point");
  const clip = (vals: SeriesValues) => Array.from({ length: n }, (_, i) => finiteOrNull(vals[i]));

  const valueSets: (number | null)[][] = [];
  for (const s of series) {
    if (s.kind === "band") valueSets.push(clip(s.lower), clip(s.upper));
    else valueSets.push(clip(s.values));
  }
  const include = [
    ...(hasBars ? [0] : []),
    ...refLines.filter((r) => r.extendDomain).map((r) => r.y),
  ];
  const scale = makeYScale(
    computeDomain(valueSets, { include, min: input.yDomain?.min, max: input.yDomain?.max }),
    plot.top,
    plot.bottom,
  );
  const [d0, d1] = scale.domain();
  const domain: [number, number] = [Math.min(d0, d1), Math.max(d0, d1)];
  const toPx = (vals: SeriesValues) => clip(vals).map((v) => (v === null ? null : scale(v)));

  const marks: Mark[] = series.map((s): Mark => {
    if (s.kind === "band") {
      return {
        kind: "band",
        id: s.id,
        fill: s.fill,
        d: bandPath(xs, toPx(s.lower), toPx(s.upper), { curve: s.curve, connectNulls: s.connectNulls }),
      };
    }
    if (s.kind === "bars") {
      const zero = scale(0);
      const w = step * BAR_FILL;
      const rects: BarRect[] = [];
      clip(s.values).forEach((v, index) => {
        if (v === null) return;
        const y = scale(v);
        rects.push({ index, x: xs[index] - w / 2, y: Math.min(y, zero), w, h: Math.abs(zero - y), color: s.colorAt(v, index) });
      });
      return { kind: "bars", id: s.id, rects };
    }
    const points = toPx(s.values);
    const anchors = (s.anchorIndices ?? [])
      .filter((i) => i >= 0 && i < n && points[i] !== null)
      .map((i) => ({ x: xs[i], y: points[i] as number }));
    return {
      kind: "line",
      id: s.id,
      color: s.color,
      width: s.width ?? 1.5,
      dash: s.dash,
      hidden: s.hidden ?? false,
      activeDot: s.activeDot ?? true,
      points,
      anchors,
      d: linePath(
        xs.map((x, i) => ({ x, y: points[i] })),
        { curve: s.curve, connectNulls: s.connectNulls },
      ),
    };
  });

  return {
    plot,
    xs,
    domain,
    yTicks: (input.yTicks ?? scale.ticks(5)).map((value) => ({ value, y: scale(value) })),
    xTicks: xTickIndices(xs, xMinTickGap).map((index) => ({ index, x: xs[index], label: labels[index] })),
    marks,
    refLines: refLines
      .filter((r) => r.y >= domain[0] && r.y <= domain[1])
      .map((r) => ({ ...r, py: scale(r.y) })),
  };
}
