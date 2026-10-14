import { calendarDate, periodKey } from '../../dates';
import { ZERO, rupees } from '../../money';
import { asPaymentId, asRentPeriodId, asTenancyId } from '../../ids';
import { formatPeriodStatement } from '../statement';
import type { Payment, PeriodLedgerRow, RentPeriod } from '../../types';

const d = (s: string) => calendarDate(s);
const PERIOD_ID = asRentPeriodId('t1_2026-03');

function period(over: Partial<RentPeriod> = {}): RentPeriod {
  return {
    id: PERIOD_ID,
    tenancyId: asTenancyId('t1'),
    key: periodKey('2026-03'),
    from: d('2026-03-01'),
    to: d('2026-03-31'),
    dueDate: d('2026-03-05'),
    rentPaise: rupees(18_000),
    lineItems: [],
    expectedPaise: rupees(18_000),
    ...over,
  };
}

function row(over: Partial<PeriodLedgerRow> = {}): PeriodLedgerRow {
  return {
    period: period(),
    paidPaise: ZERO,
    pendingPaise: rupees(18_000),
    status: 'pending',
    ...over,
  };
}

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: asPaymentId('p1'),
    tenancyId: asTenancyId('t1'),
    amountPaise: rupees(18_000),
    paidOn: d('2026-03-05'),
    method: 'upi',
    allocations: [{ rentPeriodId: PERIOD_ID, amountPaise: rupees(18_000) }],
    ...over,
  };
}

const META = { tenantName: 'Rahul' };

describe('formatPeriodStatement', () => {
  it('never contains an official-looking receipt number', () => {
    const text = formatPeriodStatement(row({ paidPaise: rupees(18_000), status: 'paid' }), [payment()], META);
    expect(text).not.toMatch(/UH-\d{8}-\d{3}/);
    expect(text).toContain('This is an informal summary, not a numbered receipt.');
  });

  it('shows "no payments" for a fully pending period', () => {
    const text = formatPeriodStatement(row(), [], META);
    expect(text).toContain('No payments recorded for this period yet.');
    expect(text).toContain('Pending: ₹18,000');
  });

  it('lists each payment with its own method, for a period paid partly cash and partly UPI', () => {
    const cash = payment({
      id: asPaymentId('p-cash'),
      method: 'cash',
      paidOn: d('2026-03-02'),
      amountPaise: rupees(10_000),
      allocations: [{ rentPeriodId: PERIOD_ID, amountPaise: rupees(10_000) }],
    });
    const upi = payment({
      id: asPaymentId('p-upi'),
      method: 'upi',
      paidOn: d('2026-03-20'),
      amountPaise: rupees(8_000),
      allocations: [{ rentPeriodId: PERIOD_ID, amountPaise: rupees(8_000) }],
    });
    const text = formatPeriodStatement(
      row({ paidPaise: rupees(18_000), pendingPaise: ZERO, status: 'paid' }),
      [cash, upi],
      META,
    );
    expect(text).toContain('₹10,000 via Cash on 2 Mar 2026');
    expect(text).toContain('₹8,000 via UPI on 20 Mar 2026');
  });

  it('uses only the allocated slice of a lump-sum payment spanning multiple periods', () => {
    const lumpSum = payment({
      amountPaise: rupees(36_000),
      allocations: [
        { rentPeriodId: PERIOD_ID, amountPaise: rupees(18_000) },
        { rentPeriodId: asRentPeriodId('t1_2026-04'), amountPaise: rupees(18_000) },
      ],
    });
    const text = formatPeriodStatement(
      row({ paidPaise: rupees(18_000), pendingPaise: ZERO, status: 'paid' }),
      [lumpSum],
      META,
    );
    expect(text).toContain('₹18,000 via UPI');
    expect(text).not.toContain('₹36,000');
  });

  it('ignores a payment that does not allocate to this period at all', () => {
    const otherPeriodPayment = payment({ allocations: [{ rentPeriodId: asRentPeriodId('t1_2026-04'), amountPaise: rupees(18_000) }] });
    const text = formatPeriodStatement(row(), [otherPeriodPayment], META);
    expect(text).toContain('No payments recorded for this period yet.');
  });

  it('includes the unit label when given', () => {
    const text = formatPeriodStatement(row(), [], { tenantName: 'Rahul', unitLabel: 'Flat 2B' });
    expect(text).toContain('Rahul · Flat 2B');
  });
});
