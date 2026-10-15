import { dateToIso } from "@/lib/dates";
import { dayMonth } from "./format";

/**
 * Clock and session labels for the dashboard cards, ported from the inline
 * helpers in egx-api-fe/src/app/page.tsx. See that file for the history behind
 * each rule; the short version is in each docstring.
 */

/**
 * "2026-09-02" → "2 Sep" — the SESSION the price came from, not a clock time.
 * Read from the string: `new Date("2026-09-02")` is UTC midnight, which is the
 * previous day anywhere west of Greenwich.
 */
export function sessionLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^\d{4}-\d{2}-\d{2}/.exec(iso);
  if (!m) return null;
  const label = dayMonth(m[0]);
  return label === m[0] ? null : label;
}

/**
 * Is this bar today's session? Decides whether the card may call the price a
 * "close" — today's bar is still moving while the EGX is open. Compared on the
 * date string for the same timezone reason as `sessionLabel`.
 */
export function isTodaysSession(barDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!barDate) return false;
  return barDate.slice(0, 10) === dateToIso(now);
}

/** Epoch ms → "14s ago" / "3m 14s ago" / "18h 22m ago" / "3d ago". */
export function agoLabel(at: number | undefined, now: number): string | null {
  if (!at) return null;
  const secs = Math.max(0, Math.round((now - at) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export interface StampInput {
  asOf: string | null;
  isToday: boolean;
  fetchedAgo: string | null;
  marketClosed: boolean;
}

/**
 * The card's under-price line. Names the SESSION ("2 Sep"), appends "close"
 * only for a completed bar, then either the fetch age or — while the market is
 * shut — a static "Market closed", because an age that climbs all weekend
 * reads as staleness that isn't real.
 */
export function cardStamp({ asOf, isToday, fetchedAgo, marketClosed }: StampInput): string | null {
  if (!asOf && !fetchedAgo && !marketClosed) return null;
  let out = asOf ?? "";
  if (asOf && (!isToday || marketClosed)) out += " close";
  if (marketClosed) {
    out += `${asOf ? " · " : ""}Market closed`;
  } else if (fetchedAgo) {
    out += `${asOf ? " · " : ""}${fetchedAgo}`;
  }
  return out;
}

/** A one-bar change on Weekly/Monthly is not today's move — say so. */
export function changeIntervalNote(changeInterval?: string): string | null {
  if (!changeInterval || changeInterval === "Daily") return null;
  return changeInterval === "Weekly" ? "vs last week" : "vs last month";
}
