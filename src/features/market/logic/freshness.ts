export const PE_STALE_AFTER_HOURS = 48;

/** Whole days since the P/E feed last succeeded, or null while it is fresh (PEFreshnessBanner). */
export function peStaleDays(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const hours = (nowMs - t) / 36e5;
  if (hours < PE_STALE_AFTER_HOURS) return null;
  return Math.floor(hours / 24);
}

/** "Measured 5h ago" on the risk grade (RiskGradeCard's own agoLabel). */
export function riskAgoLabel(iso: string | null | undefined, nowMs: number): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const hours = (nowMs - then) / 36e5;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
