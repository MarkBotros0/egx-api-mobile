/**
 * Formatting for the portfolio feature. "en-US" is pinned (not the device
 * locale) so digits stay Latin and grouping stays "1,234" — the same text the
 * web renders and what the tests can assert.
 */

import { isoToDate } from "@/lib/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function egp(value: number, digits = 0): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function egp2(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function signed(value: number, digits = 0): string {
  return `${value >= 0 ? "+" : ""}${egp(value, digits)}`;
}

export function signedPct(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/** P&L is a real direction, so it may use gain/loss. Nothing else should call this. */
export function pnlTone(value: number): "text-gain" | "text-loss" {
  return value >= 0 ? "text-gain" : "text-loss";
}

/** "2026-04-07" -> "7 Apr 2026", for the last-market-dividend line. */
export function fmtExDate(iso: string): string {
  const d = isoToDate(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
