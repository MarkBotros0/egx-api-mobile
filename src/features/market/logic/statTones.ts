import { DY_SUSPICIOUS_MIN, peColor } from "@/shared/constants";

/** RSI > 70 overbought, < 30 oversold (StatsPanel). */
export function rsiClass(rsi: number): string {
  if (rsi > 70) return "text-loss";
  if (rsi < 30) return "text-gain";
  return "text-white";
}

/** Volatility is magnitude: a beta of -2.10 is twice as volatile as the index. */
export function betaClass(beta: number): string {
  if (Math.abs(beta) > 1.3) return "text-loss";
  if (beta < 0) return "text-accent";
  if (beta < 0.8) return "text-gain";
  return "text-white";
}

export function signedClass(v: number): string {
  return v >= 0 ? "text-gain" : "text-loss";
}

/** The shared EGX-median P/E bands (`peColor`), neutral in the middle. EG only:
 *  another market's P/E is uncoloured (the bands are EGX facts). */
export function peClass(pe: number, marketCode: string = "EG"): string {
  return peColor(pe, marketCode) ?? "text-white";
}

/** EG only: the 15% "suspicious yield" line is an EGX finding. */
export function dividendYieldClass(dy: number, marketCode: string = "EG"): string {
  return marketCode === "EG" && dy >= DY_SUSPICIOUS_MIN ? "text-loss" : "text-white";
}
