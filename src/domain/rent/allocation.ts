import { ZERO, min, sub, type Paise } from '../money';
import type { Allocation, AllocationPolicy, PeriodLedgerRow } from '../types';

export interface AllocationResult {
  allocations: Allocation[];
  /** Received but not applied to any period. Becomes tenancy credit (§12). */
  unallocatedPaise: Paise;
}

/**
 * Split an incoming amount across open periods.
 *
 * This is the function that makes the hard cases in PRD §12 expressible:
 *   - partial payment    -> one allocation smaller than the period's pending
 *   - multiple payments  -> separate payments, each allocating to the same period
 *   - lump sum           -> one payment, allocations across several periods
 *   - overpayment        -> allocations plus a non-zero unallocated remainder
 *
 * Nothing here mutates a prior payment, which is how Rule 3 ("partial payments
 * must never overwrite previous payments") is upheld structurally rather than
 * by convention.
 */
export function allocatePayment(
  amountPaise: Paise,
  openPeriods: readonly PeriodLedgerRow[],
  policy: AllocationPolicy = 'oldest-first',
): AllocationResult {
  if (amountPaise < 0) {
    throw new Error('Cannot allocate a negative amount');
  }

  const targets =
    policy === 'oldest-first'
      ? [...openPeriods].sort((a, b) =>
          a.period.from < b.period.from ? -1 : a.period.from > b.period.from ? 1 : 0,
        )
      : [...openPeriods];

  const allocations: Allocation[] = [];
  let remaining = amountPaise;

  for (const row of targets) {
    if (remaining <= 0) break;
    if (row.pendingPaise <= 0) continue;

    const take = min(remaining, row.pendingPaise);
    allocations.push({ rentPeriodId: row.period.id, amountPaise: take });
    remaining = sub(remaining, take);
  }

  return { allocations, unallocatedPaise: remaining > 0 ? remaining : ZERO };
}

/**
 * Apply an existing credit balance to newly-opened periods — the "carry it
 * into next month?" decision in §12. Kept separate from allocatePayment so
 * that carrying credit forward is an explicit, auditable owner action rather
 * than an invisible side effect of recording a payment.
 */
export function applyCredit(
  creditPaise: Paise,
  openPeriods: readonly PeriodLedgerRow[],
): AllocationResult {
  return allocatePayment(creditPaise, openPeriods, 'oldest-first');
}
