import type { PEData } from "@/shared/types";

export const MONTHS_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * "+1.20 (+1.48%)". Both signs come from the PERCENTAGE, as on the web card,
 * so the price change and its percent can never disagree about direction.
 */
export function changeText(change: number | undefined, changePct: number | undefined): string {
  const sign = (changePct ?? 0) >= 0 ? "+" : "";
  return `${sign}${change?.toFixed(2) ?? "--"} (${sign}${changePct?.toFixed(2) ?? "--"}%)`;
}

/** "+1.50%" — the watchlist row's single figure. */
export function pctText(changePct: number | undefined): string {
  const value = changePct ?? 0;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatVolume(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toString();
}

/** Round to the precision the measurement supports — never more (ForecastCard). */
export function coarse(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatPE(pe: Pick<PEData, "pe_ratio" | "fetched_at">): string {
  if (pe.pe_ratio == null) return "—";
  const base = pe.pe_ratio.toFixed(1);
  return pe.fetched_at ? `${base} · as of ${pe.fetched_at.slice(0, 10)}` : base;
}

/** "2026-04-07" → "7 Apr". Parsed from the string, never through `new Date()`. */
export function dayMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${day} ${MONTHS_ABBR[month - 1]}`;
}

/** A percentage width for a React Native style. */
export function pct(n: number): `${number}%` {
  return `${n}%`;
}
