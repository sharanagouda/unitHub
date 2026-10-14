import { calendarDate, formatCalendarDate, periodKey, periodKeyLabel } from '../dates';
import { formatINR, rupees, ZERO } from '../money';
import { asTenancyId, asUnitId, asUserId, asPaymentId } from '../ids';
import { generateRentPeriods, rentOn } from '../rent/periods';
import { computeLedger, openRows } from '../rent/ledger';
import { allocatePayment } from '../rent/allocation';
import type { Payment, Tenancy } from '../types';

const d = (s: string) => calendarDate(s);

/** Checked index access — noUncheckedIndexedAccess is on, and a test that
 *  silently reads undefined is worse than one that throws. */
function nth<T>(xs: readonly T[], i: number): T {
  const v = xs[i];
  if (v === undefined) throw new Error(`expected element at index ${i}, got none`);
  return v;
}


function tenancy(over: Partial<Tenancy> = {}): Tenancy {
  return {
    id: asTenancyId('t1'),
    ownerId: asUserId('o1'),
    unitId: asUnitId('F1'),
    tenantUserId: null,
    tenantName: 'Rahul',
    tenantPhone: '+919876543210',
    moveInDate: d('2026-03-12'),
    moveOutDate: null,
    status: 'active',
    rentRevisions: [{ effectiveFrom: d('2026-03-12'), rentPaise: rupees(18000) }],
    dueDay: 5,
    depositPaise: rupees(60000),
    cycle: 'calendar-month',
    proration: 'full-month',
    ...over,
  };
}

function payment(
  id: string,
  amount: number,
  paidOn: string,
  allocations: Payment['allocations'],
): Payment {
  return {
    id: asPaymentId(id),
    tenancyId: asTenancyId('t1'),
    amountPaise: rupees(amount),
    paidOn: d(paidOn),
    method: 'upi',
    allocations,
  };
}

// ---------------------------------------------------------------------------
describe('money formatting (Indian grouping)', () => {
  it('groups in lakhs, not thousands', () => {
    expect(formatINR(rupees(18000))).toBe('₹18,000');
    expect(formatINR(rupees(108000))).toBe('₹1,08,000');
    expect(formatINR(rupees(1200000))).toBe('₹12,00,000');
    expect(formatINR(rupees(450))).toBe('₹450');
  });
});

// ---------------------------------------------------------------------------
describe('PRD §10 — move-in mid-month, full-month policy', () => {
  const t = tenancy();

  it('bills the partial first month in full', () => {
    const march = nth(generateRentPeriods(t, d('2026-03-31')), 0);
    expect(march.key).toBe('2026-03');
    expect(march.from).toBe('2026-03-12'); // clipped to move-in
    expect(march.to).toBe('2026-03-31');
    expect(march.expectedPaise).toBe(rupees(18000)); // NOT prorated
  });

  it('leaves ₹8,000 outstanding after an initial ₹10,000', () => {
    const periods = generateRentPeriods(t, d('2026-03-31'));
    const pay = payment('p1', 10000, '2026-03-12', [
      { rentPeriodId: nth(periods, 0).id, amountPaise: rupees(10000) },
    ]);

    const ledger = computeLedger(periods, [pay]);
    expect(nth(ledger.rows, 0).pendingPaise).toBe(rupees(8000));
    expect(nth(ledger.rows, 0).status).toBe('partial');
  });
});

describe('proration policy changes the same move-in', () => {
  it('charges 20/31 of March when prorated', () => {
    const t = tenancy({ proration: 'prorated' });
    const march = nth(generateRentPeriods(t, d('2026-03-31')), 0);
    // 12 Mar..31 Mar inclusive = 20 days of 31
    expect(march.expectedPaise).toBe(Math.round((1800000 * 20) / 31));
  });
});

// ---------------------------------------------------------------------------
describe('PRD §11 — the ledger table', () => {
  const t = tenancy();
  const periods = generateRentPeriods(t, d('2026-06-30'));
  const mar = nth(periods, 0);
  const apr = nth(periods, 1);
  const may = nth(periods, 2);
  const jun = nth(periods, 3);

  const payments = [
    payment('p1', 10000, '2026-03-12', [{ rentPeriodId: mar.id, amountPaise: rupees(10000) }]),
    payment('p2', 18000, '2026-04-05', [{ rentPeriodId: apr.id, amountPaise: rupees(18000) }]),
    payment('p3', 15000, '2026-05-05', [{ rentPeriodId: may.id, amountPaise: rupees(15000) }]),
  ];

  const ledger = computeLedger(periods, payments);

  it('reproduces the PRD table exactly', () => {
    expect(ledger.rows.map(r => [r.period.key, r.paidPaise, r.pendingPaise, r.status])).toEqual([
      ['2026-03', rupees(10000), rupees(8000), 'partial'],
      ['2026-04', rupees(18000), ZERO, 'paid'],
      ['2026-05', rupees(15000), rupees(3000), 'partial'],
      ['2026-06', ZERO, rupees(18000), 'pending'],
    ]);
  });

  it('totals across the tenancy', () => {
    expect(ledger.totalExpectedPaise).toBe(rupees(72000));
    expect(ledger.totalPaidPaise).toBe(rupees(43000));
    expect(ledger.totalPendingPaise).toBe(rupees(29000));
  });

  it('sets due dates on the nominal due day, not the move-in day', () => {
    expect(jun.dueDate).toBe('2026-06-05');
  });
});

// ---------------------------------------------------------------------------
describe('PRD §12 — payment cases', () => {
  const t = tenancy({ moveInDate: d('2026-09-01') });
  const periods = generateRentPeriods(t, d('2026-09-30'));
  const sep = nth(periods, 0);

  it('multiple payments in one month settle it', () => {
    const ledger = computeLedger(periods, [
      payment('a', 8000, '2026-09-05', [{ rentPeriodId: sep.id, amountPaise: rupees(8000) }]),
      payment('b', 10000, '2026-09-20', [{ rentPeriodId: sep.id, amountPaise: rupees(10000) }]),
    ]);
    expect(nth(ledger.rows, 0).status).toBe('paid');
    expect(nth(ledger.rows, 0).pendingPaise).toBe(ZERO);
  });

  it('overpayment yields credit, never a negative balance', () => {
    const empty = computeLedger(periods, []);
    const { allocations, unallocatedPaise } = allocatePayment(rupees(20000), openRows(empty));

    expect(allocations).toEqual([{ rentPeriodId: sep.id, amountPaise: rupees(18000) }]);
    expect(unallocatedPaise).toBe(rupees(2000));

    const ledger = computeLedger(periods, [
      payment('c', 20000, '2026-09-03', allocations),
    ]);
    expect(nth(ledger.rows, 0).pendingPaise).toBe(ZERO);
    expect(ledger.creditPaise).toBe(rupees(2000));
  });

  it('a lump sum spreads oldest-first across open periods', () => {
    const long = generateRentPeriods(t, d('2026-11-30'));
    const empty = computeLedger(long, []);
    const { allocations, unallocatedPaise } = allocatePayment(rupees(40000), openRows(empty));

    expect(allocations).toEqual([
      { rentPeriodId: nth(long, 0).id, amountPaise: rupees(18000) },
      { rentPeriodId: nth(long, 1).id, amountPaise: rupees(18000) },
      { rentPeriodId: nth(long, 2).id, amountPaise: rupees(4000) },
    ]);
    expect(unallocatedPaise).toBe(ZERO);
  });
});

// ---------------------------------------------------------------------------
describe('rent revisions', () => {
  const t = tenancy({
    moveInDate: d('2026-01-01'),
    rentRevisions: [
      { effectiveFrom: d('2026-01-01'), rentPaise: rupees(18000) },
      { effectiveFrom: d('2026-04-01'), rentPaise: rupees(19800) },
    ],
  });

  it('applies the revision from its effective month onward', () => {
    const periods = generateRentPeriods(t, d('2026-05-31'));
    expect(periods.map(p => p.expectedPaise)).toEqual([
      rupees(18000), rupees(18000), rupees(18000),
      rupees(19800), rupees(19800),
    ]);
  });

  it('rentOn resolves the rate in force', () => {
    expect(rentOn(t, d('2026-03-31'))).toBe(rupees(18000));
    expect(rentOn(t, d('2026-04-01'))).toBe(rupees(19800));
  });
});

// ---------------------------------------------------------------------------
describe('calendar edge cases', () => {
  it('clamps a 31st due day in short months', () => {
    const t = tenancy({ moveInDate: d('2026-01-31'), dueDay: 31 });
    const periods = generateRentPeriods(t, d('2026-02-28'));
    expect(nth(periods, 1).dueDate).toBe('2026-02-28');
  });

  it('anniversary cycle runs move-in day to move-in day', () => {
    const t = tenancy({ cycle: 'anniversary' });
    const periods = generateRentPeriods(t, d('2026-05-15'));
    expect(periods.map(p => [p.from, p.to, p.dueDate])).toEqual([
      ['2026-03-12', '2026-04-11', '2026-03-12'],
      ['2026-04-12', '2026-05-11', '2026-04-12'],
      ['2026-05-12', '2026-05-15', '2026-05-12'],
    ]);
  });

  it('stops generating after move-out', () => {
    const t = tenancy({ moveOutDate: d('2026-04-30'), status: 'ended' });
    const periods = generateRentPeriods(t, d('2026-08-31'));
    expect(periods.map(p => p.key)).toEqual(['2026-03', '2026-04']);
  });
});

describe('display formatting', () => {
  it('formatCalendarDate renders "D Mon YYYY"', () => {
    expect(formatCalendarDate(d('2026-03-05'))).toBe('5 Mar 2026');
    expect(formatCalendarDate(d('2026-12-31'))).toBe('31 Dec 2026');
  });

  it('periodKeyLabel renders "Month YYYY"', () => {
    expect(periodKeyLabel(periodKey('2026-03'))).toBe('March 2026');
    expect(periodKeyLabel(periodKey('2026-12'))).toBe('December 2026');
  });
});
