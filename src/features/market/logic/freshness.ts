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
