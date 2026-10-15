import { isStrongZone } from "@/lib/zones";
import { formatPrice } from "@/shared/money";
import type { NearestLevel, ZoneConfidence } from "@/shared/types";

/** A level from last week and one from last spring are not equally relevant. */
export function formatLevelAge(barsAgo: number): string {
  if (barsAgo <= 1) return "touched today";
  if (barsAgo < 10) return `${barsAgo} days ago`;
  if (barsAgo < 42) return `~${Math.round(barsAgo / 5)} weeks ago`;
  const months = Math.round(barsAgo / 21);
  return months >= 12 ? "over a year ago" : `~${months} months ago`;
}

export interface LevelReading {
  label: string;
  priceText: string;
  /** Price has crossed the level (a support above price, a resistance below it). */
  brokenThrough: boolean;
  directionText: string;
  strengthText: string;
}

export function levelReading(
  kind: "support" | "resistance",
  level: NearestLevel,
  currentPrice: number,
  currency: string
): LevelReading {
  const isSupport = kind === "support";
  const abs = Math.abs(level.distance_pct).toFixed(1);
  const brokenThrough = isSupport ? level.price > currentPrice : level.price < currentPrice;
  const side = level.price > currentPrice ? "above" : "below";
  // Strength 1 is a single pivot — one bounce. "Tested" would overstate it.
  const strength = level.strength >= 2 ? `Tested ${level.strength}x` : "Touched once — weak level";
  return {
    label: isSupport ? "Nearest Support" : "Nearest Resistance",
    priceText: formatPrice(level.price, currency),
    brokenThrough,
    directionText: `${abs}% ${side} current${brokenThrough ? " — broken" : ""}`,
    strengthText: level.bars_ago != null ? `${strength} · ${formatLevelAge(level.bars_ago)}` : strength,
  };
}

export interface ZoneTone {
  /** high/medium: a real cue. low: a bare hint, rendered neutral. */
  strong: boolean;
  textClass: string;
  boxClass: string;
  badge: { label: string; boxClass: string; textClass: string } | null;
}

/** Confidence badges take the tone of their ZONE: green must never label a sell cue. */
const BADGES: Record<"entry" | "exit", Record<ZoneConfidence, { label: string; boxClass: string; textClass: string }>> = {
  entry: {
    high: { label: "High confidence", boxClass: "bg-gain/20 border-gain/30", textClass: "text-gain" },
    medium: { label: "Medium confidence", boxClass: "bg-accent/20 border-accent/30", textClass: "text-accent" },
    low: { label: "Low confidence", boxClass: "bg-white/10 border-white/10", textClass: "text-white/60" },
  },
  exit: {
    high: { label: "High confidence", boxClass: "bg-loss/20 border-loss/30", textClass: "text-loss" },
    medium: { label: "Medium confidence", boxClass: "bg-[#ffaa00]/20 border-[#ffaa00]/30", textClass: "text-[#ffaa00]" },
    low: { label: "Low confidence", boxClass: "bg-white/10 border-white/10", textClass: "text-white/60" },
  },
};

export function zoneTone(kind: "entry" | "exit", confidence: ZoneConfidence | null): ZoneTone {
  const strong = isStrongZone(confidence);
  const isEntry = kind === "entry";
  return {
    strong,
    textClass: !strong ? "text-white/70" : isEntry ? "text-gain" : "text-loss",
    boxClass: !strong
      ? "border-white/10 bg-white/[0.02]"
      : isEntry
        ? "border-gain/20 bg-gain/[0.04]"
        : "border-loss/20 bg-loss/[0.04]",
    badge: confidence ? BADGES[kind][confidence] : null,
  };
}
