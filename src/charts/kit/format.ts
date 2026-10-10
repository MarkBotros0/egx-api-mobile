/**
 * K/M compaction used by the web's VolumeChart axis, OBV axis and Monte Carlo
 * axis. The web spelled it three times; OBV's version (which also handles
 * negatives) gives identical output for the other two, so it is the one kept.
 */
export function formatCompact(v: number): string {
  if (v >= 1e6 || v <= -1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3 || v <= -1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

/** Default y-axis tick text: integers bare, floats trimmed of binary noise. */
export function formatTick(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)));
}
