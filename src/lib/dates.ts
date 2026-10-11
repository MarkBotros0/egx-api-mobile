/**
 * Local calendar days as "YYYY-MM-DD". Never toISOString(): that is the UTC
 * day, which is yesterday for a Cairo user between midnight and 2–3am.
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return dateToIso(now);
}

/** "2026-06-01" -> local midnight of that day; null for anything else. */
export function isoToDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
