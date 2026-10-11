export type AlertScope = "watchlist" | "all";
export type Threshold = 5 | 10 | 15 | 20 | null;

export interface AlertPreferences {
  enabled: boolean;
  scope: AlertScope;
  rise_threshold: Threshold;
  fall_threshold: Threshold;
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: false,
  scope: "watchlist",
  rise_threshold: 10,
  fall_threshold: 10,
};

/** Points on the 0–100 score. null = that direction is off. */
export const THRESHOLD_CHOICES = [null, 5, 10, 15, 20] as const;

export function thresholdLabel(t: Threshold): string {
  return t === null ? "Off" : String(t);
}

export const SCOPE_OPTIONS: { value: AlertScope; label: string }[] = [
  { value: "watchlist", label: "Watchlist & holdings" },
  { value: "all", label: "All stocks" },
];
