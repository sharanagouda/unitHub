import { ZERO, add, floorZero, sub, sum, type Paise } from '../money';
import type {
  Ledger,
  Payment,
  PeriodLedgerRow,
  RentPeriod,
  RentPeriodStatus,
} from '../types';

function statusFor(expected: Paise, paid: Paise): RentPeriodStatus {
  if (paid >= expected) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

/**
 * The single source of truth for what is owed.
 *
 * PRD Rule 4: balance is derived from payment records, never stored as a
 * mutable running total. `rentPeriod.paidPaise` in Firestore is a cache for
 * query performance; this function is what it must agree with, and what
 * reconciliation compares against.
 */
export function computeLedger(
  periods: readonly RentPeriod[],
  payments: readonly Payment[],
): Ledger {
  const paidByPeriod = new Map<string, Paise>();

  for (const p of payments) {
    for (const a of p.allocations) {
      const prev = paidByPeriod.get(a.rentPeriodId) ?? ZERO;
      paidByPeriod.set(a.rentPeriodId, add(prev, a.amountPaise));
    }
  }

  const rows: PeriodLedgerRow[] = [...periods]
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
    .map(period => {
      const paidPaise = paidByPeriod.get(period.id) ?? ZERO;
      return {
        period,
        paidPaise,
        // Never negative: an overpaid period shows zero pending, and the
        // excess surfaces as credit rather than as a negative balance.
        pendingPaise: floorZero(sub(period.expectedPaise, paidPaise)),
        status: statusFor(period.expectedPaise, paidPaise),
      };
    });

  const totalReceived = sum(payments.map(p => p.amountPaise));
  const totalAllocated = sum(
    payments.flatMap(p => p.allocations.map(a => a.amountPaise)),
  );

  return {
    rows,
    totalExpectedPaise: sum(rows.map(r => r.period.expectedPaise)),
    totalPaidPaise: sum(rows.map(r => r.paidPaise)),
    totalPendingPaise: sum(rows.map(r => r.pendingPaise)),
    creditPaise: sub(totalReceived, totalAllocated),
  };
}

/** Rows still owing money, oldest first — the allocation target set. */
export const openRows = (ledger: Ledger): PeriodLedgerRow[] =>
  ledger.rows.filter(r => r.pendingPaise > 0);
