// Writes the chart gallery's JSON fixtures to src/charts/__fixtures__/.
// Shapes follow egx-api-fe/src/app/lib/types.ts (AnalysisResponse subset,
// CompareResponse, MonteCarloResult, CorrelationMatrix, PortfolioMetrics
// subset). Seeded LCG, never Math.random(): re-running writes byte-identical
// files, so a fixture diff in git always means this script changed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "charts", "__fixtures__");

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const round = (v, dp) => (v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const r2 = (v) => round(v, 2);
const r3 = (v) => round(v, 3);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

/** EGX trades Sunday–Thursday: skip Friday (5) and Saturday (6). */
function tradingDates(start, n) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 5 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function sma(xs, n) {
  return xs.map((_, i) => (i < n - 1 ? null : r3(mean(xs.slice(i - n + 1, i + 1)))));
}

/** EMA over the defined tail of `values`; bars before it stay null. */
function emaOf(values, n) {
  const out = values.map(() => null);
  const first = values.findIndex((v) => v !== null);
  if (first < 0 || values.length - first < n) return out;
  const k = 2 / (n + 1);
  let prev = mean(values.slice(first, first + n));
  out[first + n - 1] = r3(prev);
  for (let i = first + n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = r3(prev);
  }
  return out;
}

function bollinger(xs, n = 20, k = 2) {
  const upper = [];
  const middle = [];
  const lower = [];
  xs.forEach((_, i) => {
    if (i < n - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      return;
    }
    const win = xs.slice(i - n + 1, i + 1);
    const m = mean(win);
    const sd = Math.sqrt(mean(win.map((v) => (v - m) ** 2)));
    upper.push(r3(m + k * sd));
    middle.push(r3(m));
    lower.push(r3(m - k * sd));
  });
  return { upper, middle, lower };
}

function rsi(xs, n = 14) {
  return xs.map((_, i) => {
    if (i < n) return null;
    let gain = 0;
    let loss = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const d = xs[j] - xs[j - 1];
      if (d >= 0) gain += d;
      else loss -= d;
    }
    return loss === 0 ? 100 : r2(100 - 100 / (1 + gain / loss));
  });
}

function stochastic(high, low, close, n = 14, d = 3) {
  const k = close.map((c, i) => {
    if (i < n - 1) return null;
    const hh = Math.max(...high.slice(i - n + 1, i + 1));
    const ll = Math.min(...low.slice(i - n + 1, i + 1));
    return hh === ll ? 50 : r2(((c - ll) / (hh - ll)) * 100);
  });
  const dd = k.map((_, i) => {
    const win = k.slice(Math.max(0, i - d + 1), i + 1);
    return win.length < d || win.some((v) => v === null) ? null : r2(mean(win));
  });
  return { k, d: dd };
}

function obv(close, volume) {
  let acc = 0;
  return close.map((c, i) => {
    if (i > 0) acc += c > close[i - 1] ? volume[i] : c < close[i - 1] ? -volume[i] : 0;
    return acc;
  });
}

/** Straight line through bars a and c; `mid` is the third anchor. Null before a. */
function trendline(dates, a, mid, c, pa, pc) {
  const slope = (pc - pa) / (c - a);
  const at = (i) => r3(pa + slope * (i - a));
  return {
    values: dates.map((_, i) => (i < a ? null : at(i))),
    anchors: [a, mid, c].map((i) => ({ date: dates[i], price: at(i) })),
    direction: slope > 0 ? "up" : "down",
    slope_pct_per_bar: r3((slope / pa) * 100),
  };
}

function write(name, obj) {
  writeFileSync(join(OUT, name), `${JSON.stringify(obj, null, 2)}\n`);
  console.log(`wrote src/charts/__fixtures__/${name}`);
}

mkdirSync(OUT, { recursive: true });

// ---- analysis.json -------------------------------------------------------
const N = 260;
const rand = lcg(20261010);
const dates = tradingDates("2025-09-28", N);
const open = [];
const high = [];
const low = [];
const close = [];
const volume = [];
let prev = 40;
for (let i = 0; i < N; i++) {
  const o = prev * (1 + (rand() - 0.5) * 0.008);
  const c = prev * (1 + 0.0008 + (rand() - 0.5) * 0.036);
  open.push(r3(o));
  close.push(r3(c));
  high.push(r3(Math.max(o, c) * (1 + rand() * 0.012)));
  low.push(r3(Math.min(o, c) * (1 - rand() * 0.012)));
  volume.push(Math.round(600_000 + rand() * 1_800_000));
  prev = c;
}
const ema12 = emaOf(close, 12);
const ema26 = emaOf(close, 26);
const macdLine = ema12.map((v, i) => (v === null || ema26[i] === null ? null : r3(v - ema26[i])));
const macdSignal = emaOf(macdLine, 9);
const macdHist = macdLine.map((v, i) => (v === null || macdSignal[i] === null ? null : r3(v - macdSignal[i])));
const bb = bollinger(close);
const stoch = stochastic(high, low, close);

const recent = 120;
const winHigh = high.slice(N - recent);
const winLow = low.slice(N - recent);
const rh = Math.max(...winHigh);
const rl = Math.min(...winLow);
const ranUp = winLow.indexOf(rl) < winHigh.indexOf(rh); // swing ran low → high: retrace down from the high
const diff = rh - rl;
const fibLevel = (ratio) => r2(ranUp ? rh - ratio * diff : rl + ratio * diff);

write("analysis.json", {
  symbol: "COMI",
  interval: "Daily",
  bars: N,
  ohlcv: { dates, open, high, low, close, volume },
  indicators: {
    sma_20: sma(close, 20),
    sma_50: sma(close, 50),
    sma_200: sma(close, 200),
    ema_12: ema12,
    ema_26: ema26,
    bollinger_upper: bb.upper,
    bollinger_middle: bb.middle,
    bollinger_lower: bb.lower,
    rsi: rsi(close),
    macd_line: macdLine,
    macd_signal: macdSignal,
    macd_histogram: macdHist,
    stochastic_k: stoch.k,
    stochastic_d: stoch.d,
    obv: obv(close, volume),
  },
  support_resistance: {
    supports: [
      { price: r2(Math.min(...low.slice(N - 60))), strength: 3 },
      { price: r2(Math.min(...low) * 0.97), strength: 1 }, // far below the visible range: must stretch the axis
    ],
    resistances: [
      { price: r2(Math.max(...high.slice(N - 60))), strength: 3 },
      { price: r2(Math.max(...high) * 1.03), strength: 1 },
    ],
  },
  fibonacci: {
    high: r2(rh),
    low: r2(rl),
    direction: ranUp ? "up" : "down",
    levels: {
      "0%": r2(ranUp ? rh : rl),
      "23.6%": fibLevel(0.236),
      "38.2%": fibLevel(0.382),
      "50%": fibLevel(0.5),
      "61.8%": fibLevel(0.618),
      "78.6%": fibLevel(0.786),
      "100%": r2(ranUp ? rl : rh),
    },
  },
  trendlines: {
    support: trendline(dates, N - 110, N - 70, N - 30, low[N - 110], low[N - 30]),
    resistance: trendline(dates, N - 100, N - 60, N - 25, high[N - 100], high[N - 25]),
  },
});

// ---- compare.json --------------------------------------------------------
function pctWalk(r, n, drift, vol) {
  let level = 1;
  return Array.from({ length: n }, (_, i) => {
    if (i > 0) level *= 1 + drift + (r() - 0.5) * vol;
    return r2((level - 1) * 100);
  });
}
function maxDrawdown(pcts) {
  let peak = -Infinity;
  let mdd = 0;
  for (const p of pcts) {
    if (p === null) continue;
    const level = 1 + p / 100;
    peak = Math.max(peak, level);
    mdd = Math.min(mdd, level / peak - 1);
  }
  return r2(mdd * 100);
}
const cdates = dates.slice(-60);
const COMI = pctWalk(lcg(1), 60, 0.002, 0.04);
const ETEL = pctWalk(lcg(2), 60, -0.001, 0.03);
const HRHO = pctWalk(lcg(3), 60, 0.001, 0.05).map((v, i) => (i < 5 ? null : v)); // listed late: leading nulls
const lastOf = (xs) => xs[xs.length - 1];
write("compare.json", {
  symbols: ["COMI", "ETEL", "HRHO"],
  dates: cdates,
  stats: {
    COMI: { total_return: lastOf(COMI), volatility: 28.4, max_drawdown: maxDrawdown(COMI) },
    ETEL: { total_return: lastOf(ETEL), volatility: 21.7, max_drawdown: maxDrawdown(ETEL) },
    HRHO: { total_return: lastOf(HRHO), volatility: 34.9, max_drawdown: maxDrawdown(HRHO) },
  },
  COMI,
  ETEL,
  HRHO,
});

// ---- monte-carlo.json ----------------------------------------------------
const days = 60;
const Z = { p5: -1.645, p25: -0.674, p50: 0, p75: 0.674, p95: 1.645 };
const percentiles = Object.fromEntries(
  Object.entries(Z).map(([k, z]) => [
    k,
    Array.from({ length: days }, (_, i) => round(Math.exp(0.0004 * (i + 1) + z * 0.012 * Math.sqrt(i + 1)), 4)),
  ]),
);
write("monte-carlo.json", {
  days,
  initial_value: 250000,
  probability_of_loss: 0.38,
  worst_case_5pct: lastOf(percentiles.p5),
  pessimistic_25pct: lastOf(percentiles.p25),
  median: lastOf(percentiles.p50),
  optimistic_75pct: lastOf(percentiles.p75),
  best_case_95pct: lastOf(percentiles.p95),
  percentiles,
});

// ---- correlation.json ----------------------------------------------------
write("correlation.json", {
  symbols: ["COMI", "ETEL", "HRHO", "SWDY", "TMGH"],
  matrix: [
    [1, 0.82, 0.45, 0.12, -0.05],
    [0.82, 1, 0.38, 0.08, -0.45],
    [0.45, 0.38, 1, 0.22, 0.31],
    [0.12, 0.08, 0.22, 1, -0.35],
    [-0.05, -0.45, 0.31, -0.35, 1],
  ],
});

// ---- portfolio-metrics.json ---------------------------------------------
write("portfolio-metrics.json", {
  sector_allocation: {
    Banks: 42.5,
    Telecommunications: 21.3,
    "Real Estate": 18.2,
    "Food & Beverage": 12,
    Industrials: 6,
  },
});
