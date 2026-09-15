/**
 * Rent periods are *calendar* facts, not instants.
 *
 * A due date of "5 October" is the 5th of October regardless of the device
 * timezone. Storing an instant and formatting it locally shifts due dates by
 * a day for anyone whose phone is set outside IST — including your own device
 * while travelling, and any CI runner in UTC.
 *
 * So: all rent logic operates on CalendarDate strings, and conversion from a
 * real instant happens once, at the boundary, in IST.
 *
 * India observes no DST, so Asia/Kolkata is a fixed UTC+05:30 offset. That
 * makes the boundary conversion exact without a timezone database.
 */

declare const CalendarDateBrand: unique symbol;
declare const PeriodKeyBrand: unique symbol;

/** "YYYY-MM-DD" */
export type CalendarDate = string & { readonly [CalendarDateBrand]: true };
/** "YYYY-MM" — identifies a rent period for a calendar-month cycle. */
export type PeriodKey = string & { readonly [PeriodKeyBrand]: true };

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEY_RE = /^\d{4}-\d{2}$/;

export function calendarDate(s: string): CalendarDate {
  if (!DATE_RE.test(s)) {
    throw new Error(`Invalid CalendarDate "${s}", expected YYYY-MM-DD`);
  }
  return s as CalendarDate;
}

export function periodKey(s: string): PeriodKey {
  if (!KEY_RE.test(s)) {
    throw new Error(`Invalid PeriodKey "${s}", expected YYYY-MM`);
  }
  return s as PeriodKey;
}

/** The single boundary conversion: an instant -> the IST calendar day it fell on. */
export function toCalendarDateIST(instant: Date): CalendarDate {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return calendarDate(shifted.toISOString().slice(0, 10));
}

export function todayIST(now: Date = new Date()): CalendarDate {
  return toCalendarDateIST(now);
}

// --- pure calendar arithmetic (UTC-based, exact for date-only values) ---

function parts(d: CalendarDate): { y: number; m: number; day: number } {
  return { y: +d.slice(0, 4), m: +d.slice(5, 7), day: +d.slice(8, 10) };
}

function fmt(y: number, m: number, day: number): CalendarDate {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return calendarDate(`${pad(y, 4)}-${pad(m)}-${pad(day)}`);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Add months, clamping the day to the target month's length.
 * 31 Jan + 1 month => 28 Feb (not 3 Mar). This is what tenants and owners
 * expect of a monthly cycle, and what JS Date does NOT do by default.
 */
export function addMonths(d: CalendarDate, n: number): CalendarDate {
  const { y, m, day } = parts(d);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(day, daysInMonth(ny, nm)));
}

export function addDays(d: CalendarDate, n: number): CalendarDate {
  const { y, m, day } = parts(d);
  const t = new Date(Date.UTC(y, m - 1, day + n));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function compare(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
export const isBefore = (a: CalendarDate, b: CalendarDate) => a < b;
export const isAfter = (a: CalendarDate, b: CalendarDate) => a > b;
export const isSameOrBefore = (a: CalendarDate, b: CalendarDate) => a <= b;

export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const pa = parts(a);
  const pb = parts(b);
  const ms =
    Date.UTC(pb.y, pb.m - 1, pb.day) - Date.UTC(pa.y, pa.m - 1, pa.day);
  return Math.round(ms / 86_400_000);
}

/** Inclusive day count: 1 Mar..31 Mar = 31 days. */
export const inclusiveDays = (from: CalendarDate, to: CalendarDate) =>
  daysBetween(from, to) + 1;

// --- period keys ---

export const toPeriodKey = (d: CalendarDate): PeriodKey =>
  periodKey(d.slice(0, 7));

export const firstOfMonth = (k: PeriodKey): CalendarDate =>
  calendarDate(`${k}-01`);

export function lastOfMonth(k: PeriodKey): CalendarDate {
  const y = +k.slice(0, 4);
  const m = +k.slice(5, 7);
  return fmt(y, m, daysInMonth(y, m));
}

export const addMonthsToKey = (k: PeriodKey, n: number): PeriodKey =>
  toPeriodKey(addMonths(firstOfMonth(k), n));

/** Clamp a nominal due-day (e.g. 31) into a real date within the month. */
export function dueDateInMonth(k: PeriodKey, dueDay: number): CalendarDate {
  const y = +k.slice(0, 4);
  const m = +k.slice(5, 7);
  return fmt(y, m, Math.min(Math.max(dueDay, 1), daysInMonth(y, m)));
}
