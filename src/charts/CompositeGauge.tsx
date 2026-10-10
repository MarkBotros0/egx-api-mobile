import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import {
  SCORE_BUY_MAX,
  SCORE_HOLD_MAX,
  SCORE_SELL_MAX,
  SCORE_STRONG_SELL_MAX,
  scoreBand,
} from "@/shared/constants";
import type { CompositeSignal } from "@/shared/types";

import { CHART_FONT } from "./kit/palette";

export interface CompositeGaugeProps {
  score: number | null | undefined;
  signal?: CompositeSignal | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

/** Linear interpolation between two hex colours. */
function lerpColor(a: string, b: string, t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t = clamp(t);
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff;
  const ag = (pa >> 8) & 0xff;
  const ab = pa & 0xff;
  const br = (pb >> 16) & 0xff;
  const bg = (pb >> 8) & 0xff;
  const bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

const NO_SCORE_TEXT = "rgba(255,255,255,0.3)";

/**
 * Colour for a composite score. Bands are lower-bound-inclusive, matching
 * `scoreBand` and the backend's `classify_signal` — a score of 60 is a green
 * BUY ring, a 20 is Sell (no Strong-Sell red, no pulse). Port of the web's
 * scoreColor; keep the two identical.
 */
export function scoreColor(score: number): string {
  // Diverges from the web on purpose: there NaN yields "#000000" (invisible
  // text); here it gets the no-score colour. ±Infinity still clamps to the ends.
  if (Number.isNaN(score)) return NO_SCORE_TEXT;
  switch (scoreBand(score)) {
    case "strong_sell":
      return lerpColor("#ff3355", "#ff6644", score / SCORE_STRONG_SELL_MAX);
    case "sell":
      return lerpColor("#ff6644", "#ffaa00", (score - SCORE_STRONG_SELL_MAX) / (SCORE_SELL_MAX - SCORE_STRONG_SELL_MAX));
    case "hold":
      return lerpColor("#ffaa00", "#c8b400", (score - SCORE_SELL_MAX) / (SCORE_HOLD_MAX - SCORE_SELL_MAX));
    case "buy":
      return lerpColor("#00cc66", "#00e07a", (score - SCORE_HOLD_MAX) / (SCORE_BUY_MAX - SCORE_HOLD_MAX));
    case "strong_buy":
      return lerpColor("#00e07a", "#00ff88", Math.min(1, (score - SCORE_BUY_MAX) / (100 - SCORE_BUY_MAX)));
  }
}

const SIZES = {
  sm: { box: 40, stroke: 4, font: 11, signalFont: 0 },
  md: { box: 96, stroke: 8, font: 22, signalFont: 10 },
  lg: { box: 160, stroke: 12, font: 40, signalFont: 13 },
} as const;

const TRACK = "rgba(255,255,255,0.07)";
const SIGNAL_TEXT = "rgba(255,255,255,0.6)";

/** Tailwind animate-pulse: opacity 1 → 0.5 → 1, 2s, forever. */
function Pulse({ active, children }: { active: boolean; children: ReactNode }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!active) {
      cancelAnimation(opacity);
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(withSequence(withTiming(0.5, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1),
    );
    return () => cancelAnimation(opacity);
  }, [active, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View testID={active ? "gauge-pulse" : undefined} style={style}>
      {children}
    </Animated.View>
  );
}

export function CompositeGauge({ score, signal, size = "md", showLabel }: CompositeGaugeProps) {
  const dims = SIZES[size];
  const cx = dims.box / 2;
  const cy = dims.box / 2;
  const r = (dims.box - dims.stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const hasScore = typeof score === "number" && Number.isFinite(score);
  const value = hasScore ? score : 0;
  const displayScore = hasScore ? Math.round(value) : null;
  const color = hasScore ? scoreColor(value) : NO_SCORE_TEXT;
  const pct = hasScore ? Math.max(0, Math.min(100, value)) / 100 : 0;
  const dashOffset = circumference * (1 - pct);

  // Only a genuine Strong Sell (below 20) gets the alarm animation.
  const pulsing = hasScore && scoreBand(value) === "strong_sell";
  const label = showLabel ?? size !== "sm";
  const a11y = hasScore
    ? `Composite score ${displayScore}${signal ? ` ${signal}` : ""}`
    : "Composite score unavailable";

  return (
    <View testID="composite-gauge" accessible accessibilityLabel={a11y} className="items-center">
      <Pulse active={pulsing}>
        <Svg width={dims.box} height={dims.box} viewBox={`0 0 ${dims.box} ${dims.box}`}>
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke={TRACK} strokeWidth={dims.stroke} />
          {hasScore ? (
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={dims.stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ) : null}
          <SvgText
            x={cx}
            y={cy + dims.font * 0.35}
            textAnchor="middle"
            fontSize={dims.font}
            fontFamily={CHART_FONT.monoSemibold}
            fill={hasScore ? color : NO_SCORE_TEXT}
          >
            {displayScore === null ? "—" : String(displayScore)}
          </SvgText>
          {label && signal && size !== "sm" ? (
            <SvgText
              x={cx}
              y={cy + dims.font * 0.7 + 4 + dims.signalFont * 0.35}
              textAnchor="middle"
              fontSize={dims.signalFont}
              fontFamily={CHART_FONT.sansSemibold}
              fill={SIGNAL_TEXT}
            >
              {signal}
            </SvgText>
          ) : null}
        </Svg>
      </Pulse>
    </View>
  );
}
