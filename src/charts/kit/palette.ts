import { COLORS } from "@/shared/theme";

/**
 * The ONE file under src/charts that reads COLORS. Plan 1 owns the key names
 * in @/shared/theme; if they are ever renamed, this is the only place to fix.
 * The rgba greys are the web charts' literal grid/axis/tick values.
 */
export const CHART = {
  bg: COLORS["charcoal-dark"], // page background — fill of hollow anchor dots
  surface: COLORS.charcoal,
  gain: COLORS.gain,
  loss: COLORS.loss,
  accent: COLORS.accent,
  white: "#ffffff",
  grid: "rgba(255,255,255,0.05)",
  axisLine: "rgba(255,255,255,0.1)",
  tick: "rgba(255,255,255,0.3)",
  tickDim: "rgba(255,255,255,0.2)",
  crosshair: "rgba(255,255,255,0.3)",
} as const;

/**
 * SVG <Text> needs the registered font FAMILY name — React Native cannot pick
 * a weight of a custom font. These are the names Plan 1 registers with
 * useFonts (the @expo-google-fonts export names).
 */
export const CHART_FONT = {
  sans: "Outfit_400Regular",
  sansSemibold: "Outfit_600SemiBold",
  mono: "JetBrainsMono_400Regular",
  monoSemibold: "JetBrainsMono_600SemiBold",
} as const;

/** "#00ff88", 0.5 → "rgba(0,255,136,0.5)". Anything that is not #rrggbb is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}
