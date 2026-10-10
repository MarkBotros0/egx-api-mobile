import { scaleLinear, type ScaleLinear } from "d3-scale";

export type Num = number | null | undefined;

/** The one rule for "is this a plottable value": finite number, else null. */
export function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export interface DomainOptions {
  /** Extra values the domain must contain (0 for bars, extendDomain reference lines). */
  include?: readonly number[];
  /** Fixed lower end (e.g. 0 for RSI and volume). */
  min?: number;
  /** Fixed upper end (e.g. 100 for RSI). */
  max?: number;
}

export function computeDomain(sets: readonly (readonly Num[])[], opts: DomainOptions = {}): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const set of sets) {
    for (const raw of set) {
      const v = finiteOrNull(raw);
      if (v === null) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  for (const v of opts.include ?? []) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (opts.min !== undefined) lo = opts.min;
  if (opts.max !== undefined) hi = opts.max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = opts.min ?? 0;
    hi = opts.max ?? lo + 1;
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.01 || 1;
    return [opts.min ?? lo - pad, opts.max ?? hi + pad];
  }
  if (lo > hi) return [lo, lo + 1];
  return [lo, hi];
}

/** Linear y scale, domain minimum at `bottom`, rounded out to nice ticks (Recharts "auto"). */
export function makeYScale(domain: [number, number], top: number, bottom: number): ScaleLinear<number, number> {
  return scaleLinear().domain(domain).range([bottom, top]).nice(5);
}

/**
 * "point": first and last bar on the plot edges (Recharts LineChart).
 * "band": each bar centred in an equal slot (Recharts BarChart / ComposedChart with bars).
 */
export function xPositions(
  n: number,
  left: number,
  right: number,
  layout: "point" | "band",
): { xs: number[]; step: number } {
  if (n <= 0) return { xs: [], step: 0 };
  const w = Math.max(0, right - left);
  if (layout === "band") {
    const step = w / n;
    return { xs: Array.from({ length: n }, (_, i) => left + step * (i + 0.5)), step };
  }
  if (n === 1) return { xs: [left + w / 2], step: w };
  const step = w / (n - 1);
  return { xs: Array.from({ length: n }, (_, i) => left + step * i), step };
}

/** Recharts `interval="preserveStartEnd"` + `minTickGap`: first and last always, middle ones ≥ minGap apart. */
export function xTickIndices(xs: readonly number[], minGap: number): number[] {
  const n = xs.length;
  if (n === 0) return [];
  if (n === 1) return [0];
  const last = n - 1;
  const out = [0];
  for (let i = 1; i < last; i++) {
    const prev = xs[out[out.length - 1]];
    if (xs[i] - prev >= minGap && xs[last] - xs[i] >= minGap) out.push(i);
  }
  out.push(last);
  return out;
}

/** Index of the x closest to `x` (xs ascending); clamps outside; -1 when empty. */
export function nearestIndex(xs: readonly number[], x: number): number {
  const n = xs.length;
  if (n === 0) return -1;
  if (x <= xs[0]) return 0;
  if (x >= xs[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return x - xs[lo] <= xs[hi] - x ? lo : hi;
}
