import {
  addDays,
  addMonths,
  daysInMonth,
  dueDateInMonth,
  firstOfMonth,
  inclusiveDays,
  isAfter,
  lastOfMonth,
  toPeriodKey,
  type CalendarDate,
} from '../dates';
import { paise, sum, type Paise } from '../money';
import { asRentPeriodId } from '../ids';
import type { RentPeriod, Tenancy } from '../types';

/** The rent in force on a given date, per the tenancy's revision history. */
export function rentOn(tenancy: Tenancy, on: CalendarDate): Paise {
  const applicable = tenancy.rentRevisions
    .filter(r => r.effectiveFrom <= on)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));

  const latest = applicable[applicable.length - 1];
  if (latest) return latest.rentPaise;

  // Before the first revision: fall back to the earliest known rent rather
  // than billing zero, which would silently under-charge.
  const earliest = [...tenancy.rentRevisions].sort((a, b) =>
    a.effectiveFrom < b.effectiveFrom ? -1 : 1,
  )[0];
  if (!earliest) {
    throw new Error(`Tenancy ${tenancy.id} has no rentRevisions`);
  }
  return earliest.rentPaise;
}

function prorate(full: Paise, occupiedDays: number, totalDays: number): Paise {
  return paise(Math.round((full * occupiedDays) / totalDays));
}

/**
 * Materialise every rent period from move-in through `asOf` (or move-out).
 *
 * Deliberately pure and deterministic: period IDs are derived from the
 * tenancy and the period start, so regenerating is an idempotent upsert in
 * Firestore rather than a source of duplicates. This is why periods can be
 * generated lazily on read instead of by a scheduled function that can
 * silently stop firing.
 */
export function generateRentPeriods(
  tenancy: Tenancy,
  asOf: CalendarDate,
): RentPeriod[] {
  const end = tenancy.moveOutDate && tenancy.moveOutDate < asOf
    ? tenancy.moveOutDate
    : asOf;

  if (isAfter(tenancy.moveInDate, end)) return [];

  return tenancy.cycle === 'calendar-month'
    ? calendarMonthPeriods(tenancy, end)
    : anniversaryPeriods(tenancy, end);
}

function calendarMonthPeriods(t: Tenancy, end: CalendarDate): RentPeriod[] {
  const out: RentPeriod[] = [];
  let cursor = firstOfMonth(toPeriodKey(t.moveInDate));

  while (!isAfter(cursor, end)) {
    const key = toPeriodKey(cursor);
    const monthStart = firstOfMonth(key);
    const monthEnd = lastOfMonth(key);

    // Clip the period to the tenancy's actual occupancy.
    const from = monthStart < t.moveInDate ? t.moveInDate : monthStart;
    const to = monthEnd > end ? end : monthEnd;

    const full = rentOn(t, from);
    const total = daysInMonth(+key.slice(0, 4), +key.slice(5, 7));
    const occupied = inclusiveDays(from, to);
    const isPartialMonth = occupied < total;

    const rentPaise =
      t.proration === 'prorated' && isPartialMonth
        ? prorate(full, occupied, total)
        : full;

    out.push({
      id: asRentPeriodId(`${t.id}_${key}`),
      tenancyId: t.id,
      key,
      from,
      to,
      dueDate: dueDateInMonth(key, t.dueDay),
      rentPaise,
      lineItems: [],
      expectedPaise: rentPaise,
    });

    cursor = addMonths(monthStart, 1);
  }
  return out;
}

function anniversaryPeriods(t: Tenancy, end: CalendarDate): RentPeriod[] {
  const out: RentPeriod[] = [];

  for (let n = 0; ; n++) {
    const from = addMonths(t.moveInDate, n);
    if (isAfter(from, end)) break;

    const naturalTo = addDays(addMonths(t.moveInDate, n + 1), -1);
    const to = naturalTo > end ? end : naturalTo;

    const full = rentOn(t, from);
    const total = inclusiveDays(from, naturalTo);
    const occupied = inclusiveDays(from, to);

    const rentPaise =
      t.proration === 'prorated' && occupied < total
        ? prorate(full, occupied, total)
        : full;

    out.push({
      id: asRentPeriodId(`${t.id}_${from}`),
      tenancyId: t.id,
      key: toPeriodKey(from),
      from,
      to,
      // An anniversary cycle's rent falls due at the start of its own period;
      // a separate dueDay would contradict the cycle.
      dueDate: from,
      rentPaise,
      lineItems: [],
      expectedPaise: rentPaise,
    });
  }
  return out;
}

/** Recompute expected after line items change. */
export function withLineItems(
  period: RentPeriod,
  lineItems: RentPeriod['lineItems'],
): RentPeriod {
  return {
    ...period,
    lineItems,
    expectedPaise: sum([period.rentPaise, ...lineItems.map(l => l.amountPaise)]),
  };
}
