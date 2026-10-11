/**
 * Learn calculators — native twins of the web's components/learn/widgets.tsx.
 * Every formula and verdict comes from @/shared/learnWidgets, which imports
 * its rules from @/shared/constants: a widget that teaches a different number
 * from the one the app computes is worse than no widget.
 *
 * Translations: CSS `linear-gradient` strip → react-native-svg gradient;
 * `left: calc(x% - 1.5px)` → `left: x%` + `marginLeft: -1.5`; CSS grid
 * readout → two-column flex-wrap.
 */
import { useId, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { AppText } from "@/ui";
import { V } from "@/shared/learnVisuals";
import {
  RSI_STRIP_STOPS,
  SCORE_BAND_SEGMENTS,
  SCORE_EXPLORER_NOTE,
  STOP_LOSS_FORMULA,
  TBILL_TITLE,
  egp,
  positionSizing,
  readoutColor,
  rsiReading,
  scoreBandReading,
  stopLossPlan,
  tBillRace,
  type ReadoutItem,
} from "@/shared/learnWidgets";
import { pct } from "@/features/market/logic/format";
import { svgSafeId } from "./visuals";

/** Round a native slider value to the step grid (Android reports 30.000001). */
export function snapToStep(v: number, min: number, max: number, step: number): number {
  const snapped = Math.round((v - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(4));
}

/** "#rrggbbaa" → colour + opacity, for SVG stops that want them separately. */
export function splitHexAlpha(color: string): { color: string; opacity: number } {
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    return { color: color.slice(0, 7), opacity: parseInt(color.slice(7), 16) / 255 };
  }
  return { color, opacity: 1 };
}

// ---------------------------------------------------------------- chrome

function Panel({ title, children, accent = V.accent }: { title: string; children: ReactNode; accent?: string }) {
  return (
    <View className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/25">
      <View className="flex-row items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <AppText numberOfLines={1} className="flex-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/45">
          {title}
        </AppText>
        <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/25">try it</AppText>
      </View>
      <View className="p-3">{children}</View>
    </View>
  );
}

function LearnSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  accent = V.accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
}) {
  // Fed once: re-feeding `value` during a drag makes the native thumb jitter.
  const [initial] = useState(value);
  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
        <AppText className="flex-1 text-[11px] text-white/55">{label}</AppText>
        <AppText className="font-mono-semibold text-[12px]" style={{ color: accent }}>
          {`${value}${suffix}`}
        </AppText>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={initial}
        onValueChange={(v: number) => onChange(snapToStep(v, min, max, step))}
        minimumTrackTintColor={accent}
        maximumTrackTintColor="rgba(255,255,255,0.15)"
        thumbTintColor={accent}
        style={{ height: 44 }}
      />
    </View>
  );
}

function Readout({ items }: { items: ReadoutItem[] }) {
  return (
    <View className="mt-1 flex-row flex-wrap rounded-md bg-white/[0.03] px-2.5 pt-2.5">
      {items.map((i) => (
        <View key={i.label} className="mb-2.5 w-1/2 pr-3">
          <AppText numberOfLines={1} className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/35">
            {i.label}
          </AppText>
          <AppText className="mt-0.5 font-mono-semibold text-[13px]" style={{ color: readoutColor(i.tone) }}>
            {i.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Marker({ at, color }: { at: number; color: string }) {
  return (
    <View
      className="absolute top-0 h-full w-[3px] rounded-full"
      style={{ left: pct(at), marginLeft: -1.5, backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------- RSI

export function RsiPlayground() {
  const [rsi, setRsi] = useState(58);
  const reading = rsiReading(rsi);
  const gid = svgSafeId("rsi", useId());

  return (
    <Panel title="RSI — drag to read it" accent={V.gold}>
      <View className="relative mb-3 h-9 overflow-hidden rounded-md">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 1" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              {RSI_STRIP_STOPS.map((s) => {
                const { color, opacity } = splitHexAlpha(s.color);
                return <Stop key={s.offset} offset={`${s.offset}%`} stopColor={color} stopOpacity={opacity} />;
              })}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={1} fill={`url(#${gid})`} />
        </Svg>
        {[30, 70].map((t) => (
          <View key={t} className="absolute bottom-0 top-0 w-px bg-white/25" style={{ left: pct(t) }} />
        ))}
        <Marker at={rsi} color={reading.tone} />
        <View className="absolute bottom-0 left-1.5 top-0 justify-center">
          <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/50">oversold</AppText>
        </View>
        <View className="absolute bottom-0 right-1.5 top-0 justify-center">
          <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/50">overbought</AppText>
        </View>
      </View>

      <LearnSlider label="RSI reading" value={rsi} min={0} max={100} accent={reading.tone} onChange={setRsi} />
      <AppText
        className="mt-1 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-[18px]"
        style={{ color: reading.tone }}
      >
        {reading.verdict}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- stop-loss

export function StopLossCalculator() {
  const [support, setSupport] = useState(98);
  const [atr, setAtr] = useState(4);
  const [entry, setEntry] = useState(104);
  const plan = stopLossPlan(entry, support, atr);

  return (
    <Panel title="Stop-loss — the app's own formula" accent={V.coral}>
      <AppText className="mb-3 font-mono text-[10px] leading-[16px] text-white/40">{STOP_LOSS_FORMULA}</AppText>
      <LearnSlider label="Entry price you'd pay" value={entry} min={60} max={160} suffix=" EGP" accent={V.coral} onChange={setEntry} />
      <LearnSlider label="Nearest support" value={support} min={50} max={150} suffix=" EGP" accent={V.coral} onChange={setSupport} />
      <LearnSlider label="ATR (typical daily move)" value={atr} min={0.5} max={12} step={0.5} suffix=" EGP" accent={V.coral} onChange={setAtr} />
      <Readout items={plan.readout} />
      <AppText className="mt-2 text-[10px] leading-[16px] text-white/40">{plan.advice}</AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- sizing

export function PositionSizer() {
  const [portfolio, setPortfolio] = useState(100000);
  const [weight, setWeight] = useState(10);
  const [drop, setDrop] = useState(50);
  const sizing = positionSizing(portfolio, weight, drop);

  return (
    <Panel title="Position sizing — what a drop actually costs" accent={V.teal}>
      <LearnSlider label="Portfolio value" value={portfolio} min={10000} max={1000000} step={10000} suffix=" EGP" accent={V.teal} onChange={setPortfolio} />
      <LearnSlider label="Put into this one stock" value={weight} min={1} max={40} suffix="%" accent={V.teal} onChange={setWeight} />
      <LearnSlider label="If it then falls" value={drop} min={5} max={80} step={5} suffix="%" accent={V.teal} onChange={setDrop} />
      <Readout items={sizing.readout} />
      <AppText className="mt-2 text-[10px] leading-[16px]" style={{ color: sizing.verdict.tone }}>
        {sizing.verdict.text}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- T-bill

export function TBillRace() {
  const [stockReturn, setStockReturn] = useState(18);
  const [years, setYears] = useState(5);
  const race = tBillRace(stockReturn, years);

  return (
    <Panel title={TBILL_TITLE} accent={V.violet}>
      <LearnSlider label="Stock returns, per year" value={stockReturn} min={-10} max={60} suffix="%" accent={race.winning ? V.up : V.down} onChange={setStockReturn} />
      <LearnSlider label="Held for" value={years} min={1} max={15} suffix={years === 1 ? " year" : " years"} accent={V.violet} onChange={setYears} />
      <View className="mt-3 gap-2.5">
        {race.rows.map((r) => (
          <View key={r.label}>
            <View className="mb-1 flex-row items-baseline justify-between gap-2">
              <AppText className="flex-1 text-[11px] text-white/55">{r.label}</AppText>
              <AppText className="font-mono-semibold text-[11px]" style={{ color: r.color }}>
                {egp(r.value)}
              </AppText>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <View className="h-full rounded-full" style={{ width: pct(r.barPct), backgroundColor: r.color, opacity: 0.85 }} />
            </View>
          </View>
        ))}
      </View>
      <AppText
        className="mt-3 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-[18px]"
        style={{ color: race.winning ? V.up : V.down }}
      >
        {race.message}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- bands

export function ScoreBandExplorer() {
  const [score, setScore] = useState(64);
  const reading = scoreBandReading(score);

  return (
    <Panel title="Composite score — what each band means" accent={reading.color}>
      <View className="relative mb-3 h-9 flex-row overflow-hidden rounded-md">
        {SCORE_BAND_SEGMENTS.map((s, i) => (
          <View key={s.band} style={{ width: pct(s.width), backgroundColor: `${s.color}${i === 4 ? "55" : "2e"}` }} />
        ))}
        <Marker at={score} color={reading.color} />
      </View>
      <LearnSlider label="Score" value={score} min={0} max={100} accent={reading.color} onChange={setScore} />
      <View className="mt-1 rounded-md bg-white/[0.03] p-2.5">
        <AppText className="font-mono-semibold text-[13px] uppercase tracking-[0.5px]" style={{ color: reading.color }}>
          {reading.label}
        </AppText>
        <AppText className="mt-1.5 text-[11px] leading-[18px] text-white/55">{SCORE_EXPLORER_NOTE}</AppText>
      </View>
    </Panel>
  );
}
