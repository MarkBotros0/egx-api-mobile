import type { ScoreWeights } from "@/shared/types";

export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 50;
export const WEIGHT_STEP = 5;

/**
 * The −/+ stepper that replaces the web range slider (0–50, step 5). Snaps to
 * the next multiple of 5 in the pressed direction, so an API value like 18
 * moves to 20 or 15, exactly as a slider would settle.
 */
export function stepWeight(raw: number, direction: 1 | -1): number {
  const steps =
    direction > 0 ? Math.floor(raw / WEIGHT_STEP) + 1 : Math.ceil(raw / WEIGHT_STEP) - 1;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, steps * WEIGHT_STEP));
}

export function rawTotal(w: ScoreWeights): number {
  return (Object.keys(w) as (keyof ScoreWeights)[]).reduce((s, k) => s + (w[k] || 0), 0);
}
