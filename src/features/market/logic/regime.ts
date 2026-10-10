/** Position of the market mean on the 35–60 range it has historically occupied (0–100). */
export function regimePosition(mean: number | null | undefined): number | null {
  if (mean == null) return null;
  return Math.max(0, Math.min(100, ((mean - 35) / 25) * 100));
}

export type BreadthTone = "gain" | "loss" | "neutral";

/**
 * "% above the 200-day average" is a real direction, but only outside a
 * neutral middle — at 50% the market is evenly split and painting it green
 * (or 49.9% red) would claim a direction the reading does not have.
 */
export function breadthTone(pctAbove: number): BreadthTone {
  if (pctAbove >= 55) return "gain";
  if (pctAbove <= 45) return "loss";
  return "neutral";
}

/** Both sides of a rate — readers misjudge which event a probability refers to otherwise. */
export function positiveRateSplit(rate: number): { positive: number; other: number } {
  const positive = Math.round(rate * 100);
  return { positive, other: 100 - positive };
}
