/**
 * Learn diagram library — react-native-svg twin of the web's
 * components/learn/visuals.tsx. Props are the shared shapes from
 * @/shared/learnVisuals, so the curriculum's VisualSpec objects render
 * unchanged. Geometry is copied from the web file; schematics, not market
 * data, chosen to read at a glance on a 360pt screen.
 *
 * Colour rule: V.up / V.down mean a real direction in the data, never
 * decoration.
 */
import { useId, type ReactNode } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { COLORS } from "@/shared/theme";
import { pct } from "@/features/market/logic/format";
import { AppText } from "@/ui";
import {
  V,
  VIEW_W as W,
  extent,
  toPath,
  type AllocationDonutProps,
  type BarCompareProps,
  type ConeChartProps,
  type CorrelationGridProps,
  type LedgerRowsProps,
  type LegendItem,
  type MiniChartProps,
  type StepFlowProps,
  type ZoneScaleProps,
} from "@/shared/learnVisuals";

/** Family names Plan 1 registers with useFonts (SVG text cannot use a className). */
export const SVG_MONO = "JetBrainsMono_400Regular";
export const SVG_MONO_SEMIBOLD = "JetBrainsMono_600SemiBold";

/** React 19's useId() contains « » or _ — not usable inside url(#…). */
export function svgSafeId(prefix: string, raw: string): string {
  return `${prefix}${raw.replace(/[^A-Za-z0-9]/g, "")}`;
}

const finite = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

// ---------------------------------------------------------------- frame

function LegendSwatch({ color, dash }: { color: string; dash?: boolean }) {
  return (
    <Svg width={14} height={2}>
      <Line
        x1={0}
        y1={1}
        x2={14}
        y2={1}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dash ? "3 3" : undefined}
      />
    </Svg>
  );
}

export function VisualFrame({
  children,
  caption,
  legend,
}: {
  children: ReactNode;
  caption?: string;
  legend?: LegendItem[];
}) {
  const hasFooter = Boolean(legend?.length) || Boolean(caption);
  return (
    <View className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/25">
      <View className="px-1 pt-1">{children}</View>
      {hasFooter ? (
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] px-3 py-2">
          {legend?.map((l) => (
            <View key={l.label} className="flex-row items-center gap-1.5">
              <LegendSwatch color={l.color} dash={l.dash} />
              <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/45">
                {l.label}
              </AppText>
            </View>
          ))}
          {caption ? (
            <AppText className="text-[10px] leading-[14px] text-white/35">{caption}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** An SVG drawn in VIEW_W × height units, scaled to the container's width. */
function Plot({
  height,
  label,
  children,
  testID,
  nativeID,
}: {
  height: number;
  label: string;
  children: ReactNode;
  testID?: string;
  nativeID?: string;
}) {
  return (
    <View
      testID={testID}
      nativeID={nativeID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: "100%", aspectRatio: W / height }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${height}`}>
        {children}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------- MiniChart

/**
 * The workhorse. A price path plus any combination of overlay lines, a
 * shaded channel (Bollinger), horizontal rails (support/resistance/Fib),
 * point markers and vertical highlight regions.
 */
export function MiniChart({
  series,
  lines = [],
  band,
  levels = [],
  markers = [],
  shades = [],
  height = 140,
  priceColor = V.inkBright,
  fill = true,
  caption,
  legend,
  labelPad = 34,
}: MiniChartProps) {
  const H = height;
  const padT = 12;
  const padB = 12;
  const padL = 6;
  const padR = 6 + (levels.some((l) => l.label) ? labelPad : 0);

  const [min, max] = extent([
    series,
    ...lines.map((l) => l.values),
    ...(band ? [band.upper, band.lower] : []),
    levels.map((l) => l.value),
  ]);
  const pad = (max - min) * 0.1;
  const lo = min - pad;
  const hi = max + pad;

  const n = series.length;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  // Unique per RENDERED chart, not per series: several concepts reuse one
  // illustrative series in different colours.
  const gid = svgSafeId("mc", useId());

  const pricePath = toPath(series, x, y);
  const areaPath =
    fill && n > 1 && pricePath
      ? `${pricePath}L${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)}L${x(0).toFixed(1)},${(H - padB).toFixed(1)}Z`
      : "";
  const upperPath = band ? toPath(band.upper, x, y) : "";
  const bandPath =
    band && upperPath
      ? `${upperPath}${toPath([...band.lower].reverse(), (i) => x(n - 1 - i), y).replace(/^M/, "L")}Z`
      : "";

  return (
    <VisualFrame caption={caption} legend={legend}>
      <Plot
        height={H}
        label={caption ?? "Illustrative price chart"}
        testID="mini-chart"
        nativeID={gid}
      >
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={priceColor} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={priceColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {shades.map((s, i) => (
          <G key={`sh${i}`}>
            <Rect
              x={x(s.from)}
              y={padT}
              width={Math.max(1, x(s.to) - x(s.from))}
              height={H - padT - padB}
              fill={s.color}
              opacity={0.1}
            />
            {s.label ? (
              <SvgText
                x={(x(s.from) + x(s.to)) / 2}
                y={padT + 9}
                textAnchor="middle"
                fontFamily={SVG_MONO}
                fontSize={8}
                fill={s.color}
                opacity={0.9}
              >
                {s.label}
              </SvgText>
            ) : null}
          </G>
        ))}

        {band && bandPath ? <Path d={bandPath} fill={band.color} opacity={0.12} /> : null}

        {levels.map((l, i) => (
          <G key={`lv${i}`}>
            <Line
              x1={padL}
              x2={W - padR}
              y1={y(l.value)}
              y2={y(l.value)}
              stroke={l.color}
              strokeWidth={1}
              strokeDasharray={l.dash ?? "3 3"}
              opacity={0.8}
            />
            {l.label ? (
              <SvgText x={W - padR + 4} y={y(l.value) + 3} fontFamily={SVG_MONO} fontSize={8} fill={l.color}>
                {l.label}
              </SvgText>
            ) : null}
          </G>
        ))}

        {lines.map((l, i) => {
          const d = toPath(l.values, x, y);
          return d ? (
            <Path
              key={`ln${i}`}
              d={d}
              fill="none"
              stroke={l.color}
              strokeWidth={l.width ?? 1.5}
              strokeDasharray={l.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null;
        })}

        {areaPath ? <Path d={areaPath} fill={`url(#${gid})`} /> : null}
        {pricePath ? (
          <Path
            d={pricePath}
            fill="none"
            stroke={priceColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {markers.map((m, i) => {
          const v = series[m.index];
          if (!finite(v)) return null;
          const px = x(m.index);
          const py = y(v);
          const above = m.place !== "below";
          return (
            <G key={`mk${i}`}>
              <Circle cx={px} cy={py} r={4.5} fill={m.color} opacity={0.25} />
              <Circle cx={px} cy={py} r={2.5} fill={m.color} stroke={COLORS["charcoal-dark"]} strokeWidth={1} />
              {m.label ? (
                <SvgText
                  x={Math.min(Math.max(px, 26), W - padR - 12)}
                  y={above ? py - 8 : py + 14}
                  textAnchor="middle"
                  fontFamily={SVG_MONO}
                  fontSize={8}
                  fill={m.color}
                >
                  {m.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- ZoneScale

/** A 0–100 rail with meaning-bearing zones and one or more readings on it. */
export function ZoneScale({
  zones,
  markers,
  min = 0,
  max = 100,
  ticks,
  unit = "",
  caption,
  height = 74,
}: ZoneScaleProps) {
  const H = height;
  const padL = 10;
  const padR = 10;
  const barY = 30;
  const barH = 14;
  const x = (v: number) => padL + ((v - min) / (max - min)) * (W - padL - padR);

  return (
    <VisualFrame caption={caption}>
      <Plot height={H} label={caption ?? "Scale diagram"}>
        {zones.map((z, i) => (
          <G key={`z${i}`}>
            <Rect
              x={x(z.from)}
              y={barY}
              width={Math.max(0, x(z.to) - x(z.from))}
              height={barH}
              fill={z.color}
              opacity={0.28}
            />
            {z.label ? (
              <SvgText
                x={(x(z.from) + x(z.to)) / 2}
                y={barY + barH + 11}
                textAnchor="middle"
                fontFamily={SVG_MONO}
                fontSize={8}
                fill={z.color}
                opacity={0.95}
              >
                {z.label}
              </SvgText>
            ) : null}
          </G>
        ))}
        <Rect
          x={padL}
          y={barY}
          width={W - padL - padR}
          height={barH}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
        />
        {(ticks ?? [min, max]).map((t) => (
          <SvgText
            key={`t${t}`}
            x={x(t)}
            y={barY + barH + 22}
            textAnchor="middle"
            fontFamily={SVG_MONO}
            fontSize={8}
            fill={V.ink}
          >
            {`${t}${unit}`}
          </SvgText>
        ))}
        {markers.map((m, i) => (
          <G key={`m${i}`}>
            <Path d={`M${x(m.value)},${barY - 3} l-4,-6 h8 Z`} fill={m.color ?? "#fff"} />
            <SvgText
              x={Math.min(Math.max(x(m.value), 30), W - 30)}
              y={barY - 13}
              textAnchor="middle"
              fontFamily={SVG_MONO}
              fontSize={9}
              fill={m.color ?? "#fff"}
            >
              {m.label}
            </SvgText>
          </G>
        ))}
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- BarCompare

/** Side-by-side magnitudes: T-bill vs stock, leader vs laggard, volume tiers. */
export function BarCompare({ bars, unit = "%", caption, baseline }: BarCompareProps) {
  const maxV = Math.max(
    ...bars.map((b) => Math.abs(b.value)),
    baseline ? Math.abs(baseline.value) : 0,
    1
  );
  return (
    <VisualFrame caption={caption}>
      <View className="gap-2.5 p-3">
        {bars.map((b, bi) => (
          <View key={`${bi}-${b.label}`}>
            <View className="mb-1 flex-row items-baseline justify-between gap-2">
              <AppText className="flex-1 text-[11px] text-white/65">{b.label}</AppText>
              <AppText className="font-mono-semibold text-[11px]" style={{ color: b.color }}>
                {`${b.value > 0 && unit === "%" ? "+" : ""}${b.value}${unit}`}
              </AppText>
            </View>
            <View className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <View
                className="h-full rounded-full"
                style={{
                  width: pct((Math.abs(b.value) / maxV) * 100),
                  backgroundColor: b.color,
                  opacity: 0.85,
                }}
              />
              {baseline ? (
                <View
                  className="absolute bottom-0 top-0 w-px"
                  style={{
                    left: pct((Math.abs(baseline.value) / maxV) * 100),
                    backgroundColor: baseline.color,
                  }}
                />
              ) : null}
            </View>
            {b.note ? (
              <AppText className="mt-1 text-[10px] leading-[14px] text-white/35">{b.note}</AppText>
            ) : null}
          </View>
        ))}
        {baseline ? (
          <View className="flex-row items-center gap-1.5 pt-0.5">
            <View className="h-3 w-px" style={{ backgroundColor: baseline.color }} />
            <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/40">
              {baseline.label}
            </AppText>
          </View>
        ) : null}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- StepFlow

/** A numbered sequence — numbered because the order genuinely matters. */
export function StepFlow({ steps, accent = V.accent, caption }: StepFlowProps) {
  return (
    <VisualFrame caption={caption}>
      <View className="p-3">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <View key={s.title} className={`relative flex-row gap-3 ${last ? "" : "pb-3"}`}>
              {last ? null : (
                <View
                  className="absolute bottom-0 left-[11px] top-6 w-px"
                  style={{ backgroundColor: "rgba(255,255,255,0.09)" }}
                />
              )}
              <View
                className="h-[22px] w-[22px] items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}2b`, borderWidth: 1, borderColor: `${accent}66` }}
              >
                <AppText className="font-mono-semibold text-[10px]" style={{ color: accent }}>
                  {String(i + 1)}
                </AppText>
              </View>
              <View className="min-w-0 flex-1 pt-0.5">
                <AppText className="font-sans-semibold text-[11px] text-white/85">{s.title}</AppText>
                <AppText className="mt-0.5 text-[10px] leading-[16px] text-white/45">{s.text}</AppText>
              </View>
            </View>
          );
        })}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Donut

/** Portfolio allocation: sizing, diversification, concentration. */
export function AllocationDonut({ slices, centerLabel, centerSub, caption }: AllocationDonutProps) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  const arcs = slices.reduce<{ label: string; color: string; len: number; offset: number }[]>(
    (acc, s) => {
      const len = (s.value / total) * C;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
      return [...acc, { label: s.label, color: s.color, len, offset }];
    },
    []
  );

  return (
    <VisualFrame caption={caption}>
      <View className="flex-row items-center gap-4 p-3">
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <G transform="rotate(-90 55 55)">
            {arcs.map((a) => (
              <Circle
                key={a.label}
                cx={55}
                cy={55}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={13}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
                opacity={0.9}
              />
            ))}
          </G>
          <SvgText x={55} y={53} textAnchor="middle" fontFamily={SVG_MONO_SEMIBOLD} fontSize={15} fill="#fff">
            {centerLabel}
          </SvgText>
          {centerSub ? (
            <SvgText x={55} y={66} textAnchor="middle" fontFamily={SVG_MONO} fontSize={7} fill={V.ink}>
              {centerSub}
            </SvgText>
          ) : null}
        </Svg>
        <View className="min-w-0 flex-1 gap-1.5">
          {slices.map((s) => (
            <View key={s.label} className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
              <AppText numberOfLines={1} className="min-w-0 flex-1 text-[11px] text-white/60">
                {s.label}
              </AppText>
              <AppText className="font-mono text-[11px] text-white/80">
                {`${Math.round((s.value / total) * 100)}%`}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Correlation

export function CorrelationGrid({ labels, matrix, caption }: CorrelationGridProps) {
  // +1 is concentrated risk (red), 0 is unrelated, -1 is true diversification.
  const tint = (v: number) => (v > 0.15 ? V.down : v < -0.15 ? V.up : "#7f8ea3");
  return (
    <VisualFrame caption={caption}>
      <View className="gap-1 p-3">
        <View className="flex-row gap-1">
          <View className="w-[34px]" />
          {labels.map((l) => (
            <AppText
              key={`h-${l}`}
              className="flex-1 pb-0.5 text-center font-mono text-[9px] uppercase text-white/40"
            >
              {l}
            </AppText>
          ))}
        </View>
        {matrix.map((row, r) => (
          <View key={`r-${r}`} className="flex-row items-center gap-1">
            <AppText className="w-[34px] pr-1 font-mono text-[9px] uppercase text-white/40">
              {labels[r]}
            </AppText>
            {row.map((v, c) => (
              <View
                key={`c-${r}-${c}`}
                className="flex-1 items-center justify-center rounded"
                style={{
                  aspectRatio: 1,
                  backgroundColor: tint(v),
                  opacity: r === c ? 0.18 : 0.22 + Math.abs(v) * 0.55,
                }}
              >
                <AppText className="font-mono text-[9px] text-white/90">{v.toFixed(1)}</AppText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Cone

/** Monte Carlo / expected-move fan: percentile bands widening over time. */
export function ConeChart({
  days = 60,
  start = 100,
  drift = 0.0008,
  vol = 0.018,
  caption,
}: ConeChartProps) {
  const H = 150;
  const padT = 14;
  const padB = 18;
  const padL = 8;
  const padR = 40;

  // Analytic percentile envelope — the same shape 1,000 simulated paths make.
  const zs = [-1.645, -0.674, 0, 0.674, 1.645];
  const bands = zs.map((z) =>
    Array.from({ length: days + 1 }, (_, t) => start * Math.exp(drift * t + z * vol * Math.sqrt(t)))
  );
  const lo = Math.min(...bands[0]) * 0.99;
  const hi = Math.max(...bands[4]) * 1.01;
  const x = (i: number) => padL + (i * (W - padL - padR)) / days;
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const line = (a: number[]) =>
    a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const ribbon = (a: number[], b: number[]) =>
    `${line(a)}${b
      .map((_, i) => `L${x(b.length - 1 - i).toFixed(1)},${y(b[b.length - 1 - i]).toFixed(1)}`)
      .join("")}Z`;

  return (
    <VisualFrame caption={caption}>
      <Plot height={H} label="Simulated outcome cone">
        <Path d={ribbon(bands[4], bands[0])} fill={V.accent} opacity={0.1} />
        <Path d={ribbon(bands[3], bands[1])} fill={V.accent} opacity={0.18} />
        <Path d={line(bands[2])} fill="none" stroke={V.accent} strokeWidth={1.5} strokeDasharray="4 3" />
        <Line x1={padL} x2={W - padR} y1={y(start)} y2={y(start)} stroke={V.axis} strokeWidth={1} />
        {[
          { v: bands[4][days], t: "95th", c: V.up },
          { v: bands[2][days], t: "median", c: V.accent },
          { v: bands[0][days], t: "5th", c: V.down },
        ].map((m) => (
          <SvgText key={m.t} x={W - padR + 4} y={y(m.v) + 3} fontFamily={SVG_MONO} fontSize={8} fill={m.c}>
            {m.t}
          </SvgText>
        ))}
        <SvgText x={padL} y={H - 5} fontFamily={SVG_MONO} fontSize={8} fill={V.ink}>
          today
        </SvgText>
        <SvgText x={W - padR} y={H - 5} textAnchor="end" fontFamily={SVG_MONO} fontSize={8} fill={V.ink}>
          {`+${days} days`}
        </SvgText>
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Ledger

/** A two-column "what actually happens" ledger — settlement, tax, fees. */
export function LedgerRows({ rows, caption }: LedgerRowsProps) {
  // Same as the web: only up/down carry colour; "muted" and untoned rows are ink.
  const tone = (t?: string) =>
    t === "up" ? V.up : t === "down" ? V.down : "rgba(255,255,255,0.75)";
  return (
    <VisualFrame caption={caption}>
      <View>
        {/* Keyed by index: a ledger legitimately repeats a label. */}
        {rows.map((r, i) => (
          <View
            key={`${i}-${r.left}`}
            className={`flex-row items-baseline justify-between gap-3 px-3 py-2 ${
              i < rows.length - 1 ? "border-b border-white/[0.05]" : ""
            }`}
          >
            <AppText className="flex-1 text-[11px] text-white/50">{r.left}</AppText>
            <AppText className="font-mono text-[11px]" style={{ color: tone(r.tone) }}>
              {r.right}
            </AppText>
          </View>
        ))}
      </View>
    </VisualFrame>
  );
}
