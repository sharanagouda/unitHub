import { formatCalendarDate, periodKeyLabel } from '../dates';
import { formatINR, type Paise } from '../money';
import type { Payment, PeriodLedgerRow } from '../types';

export interface StatementMeta {
  tenantName: string;
  unitLabel?: string;
}

export const METHOD_LABEL: Record<Payment['method'], string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank transfer',
  other: 'Other',
};

interface PeriodAllocation {
  payment: Payment;
  amountPaise: Paise;
}

/**
 * A payment can span several periods (a lump sum). This pulls out just the
 * slice of each payment that was actually allocated to `row`'s period — the
 * payment's full `amountPaise` would overstate it.
 */
function allocationsForPeriod(row: PeriodLedgerRow, payments: readonly Payment[]): PeriodAllocation[] {
  const result: PeriodAllocation[] = [];
  for (const payment of payments) {
    for (const allocation of payment.allocations) {
      if (allocation.rentPeriodId === row.period.id) {
        result.push({ payment, amountPaise: allocation.amountPaise });
      }
    }
  }
  return result;
}

/**
 * An informal, unnumbered monthly summary — deliberately not a legally
 * numbered receipt. docs/DECISIONS.md #12's receipt-numbering question (per
 * owner / per property / global, plus a transactional counter) is still
 * open; this doesn't answer it, and shouldn't be read as having answered it.
 */
export function formatPeriodStatement(
  row: PeriodLedgerRow,
  periodPayments: readonly Payment[],
  meta: StatementMeta,
): string {
  const allocations = allocationsForPeriod(row, periodPayments);

  const lines: string[] = [
    `Rent statement — ${periodKeyLabel(row.period.key)}`,
    meta.unitLabel ? `${meta.tenantName} · ${meta.unitLabel}` : meta.tenantName,
    `Period: ${formatCalendarDate(row.period.from)} - ${formatCalendarDate(row.period.to)}`,
    `Due: ${formatCalendarDate(row.period.dueDate)}`,
    '',
    `Expected: ${formatINR(row.period.expectedPaise)}`,
  ];

  if (allocations.length === 0) {
    lines.push('No payments recorded for this period yet.');
  } else {
    lines.push('Payments:');
    for (const { payment, amountPaise } of allocations) {
      lines.push(
        `  - ${formatINR(amountPaise)} via ${METHOD_LABEL[payment.method]} on ${formatCalendarDate(payment.paidOn)}`,
      );
    }
  }

  lines.push(
    '',
    `Paid: ${formatINR(row.paidPaise)}`,
    `Pending: ${formatINR(row.pendingPaise)}`,
    '',
    'This is an informal summary, not a numbered receipt.',
  );

  return lines.join('\n');
}
