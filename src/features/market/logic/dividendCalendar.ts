import type { DividendCalendarStock } from "@/shared/types";
import { MONTHS_ABBR } from "./format";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
/** Sunday-first, EGX-appropriate. */
export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/** `m` is 0-based (0 = January). */
export interface MonthView {
  y: number;
  m: number;
}

/** Weekday (0 = Sun) of the 1st, timezone-safe via UTC. */
export function firstWeekday(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function monthCells(y: number, m: number): (number | null)[] {
  return [
    ...Array<null>(firstWeekday(y, m)).fill(null),
    ...Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1),
  ];
}

export function isoDay(y: number, m: number, day: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftMonth(v: MonthView, delta: number): MonthView {
  const d = new Date(Date.UTC(v.y, v.m + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

export interface CalendarIndex {
  byDate: Map<string, DividendCalendarStock[]>;
  /** Newest first. */
  years: number[];
  /** Latest ex-date on record ("" when none). */
  latest: string;
}

export function indexCalendar(stocks: DividendCalendarStock[]): CalendarIndex {
  const byDate = new Map<string, DividendCalendarStock[]>();
  const yearSet = new Set<number>();
  let latest = "";
  for (const s of stocks) {
    const bucket = byDate.get(s.ex_date);
    if (bucket) bucket.push(s);
    else byDate.set(s.ex_date, [s]);
    yearSet.add(parseInt(s.ex_date.slice(0, 4), 10));
    if (s.ex_date > latest) latest = s.ex_date;
  }
  return { byDate, years: [...yearSet].sort((a, b) => b - a), latest };
}

export function viewFromIso(iso: string): MonthView | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1 };
}

/** The selected day's payers, else the whole month's, newest ex-date first. */
export function listedFor(
  stocks: DividendCalendarStock[],
  byDate: Map<string, DividendCalendarStock[]>,
  view: MonthView,
  selectedDay: string | null
): DividendCalendarStock[] {
  if (selectedDay) return byDate.get(selectedDay) ?? [];
  const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
  return stocks.filter((s) => s.ex_date.startsWith(prefix)).sort((a, b) => b.ex_date.localeCompare(a.ex_date));
}

export function monthTitle(v: MonthView): string {
  return `${MONTHS[v.m]} ${v.y}`;
}

/** "2026-04-07" → "7 Apr 2026". */
export function dayTitle(iso: string): string {
  return `${parseInt(iso.slice(8, 10), 10)} ${MONTHS_ABBR[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`;
}

/** Years present in the data, guaranteeing the viewed year is selectable. */
export function yearOptions(years: number[], viewYear: number): number[] {
  return years.includes(viewYear) ? years : [viewYear, ...years];
}
