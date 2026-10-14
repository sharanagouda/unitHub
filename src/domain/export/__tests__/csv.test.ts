import { calendarDate, periodKey } from '../../dates';
import { ZERO, rupees } from '../../money';
import { asRentPeriodId, asTenancyId } from '../../ids';
import { csvEscape, formatLedgerCsv } from '../csv';
import type { Ledger, PeriodLedgerRow, RentPeriod } from '../../types';

const d = (s: string) => calendarDate(s);

function period(over: Partial<RentPeriod> = {}): RentPeriod {
  return {
    id: asRentPeriodId('t1_2026-03'),
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

function ledger(rows: PeriodLedgerRow[], over: Partial<Ledger> = {}): Ledger {
  return {
    rows,
    totalExpectedPaise: rupees(18_000 * rows.length),
    totalPaidPaise: ZERO,
    totalPendingPaise: rupees(18_000 * rows.length),
    creditPaise: ZERO,
    ...over,
  };
}

const META = { tenantName: 'Rahul', generatedOn: d('2026-03-15') };

describe('csvEscape', () => {
  it('leaves a plain field untouched', () => {
    expect(csvEscape('paid')).toBe('paid');
  });

  it('quotes and escapes a field containing a comma', () => {
    expect(csvEscape('Rahul, Flat 2B')).toBe('"Rahul, Flat 2B"');
  });

  it('quotes and doubles internal quotes', () => {
    expect(csvEscape('Rahul "Raj" Sharma')).toBe('"Rahul ""Raj"" Sharma"');
  });

  it('quotes a field containing a newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('formatLedgerCsv', () => {
  it('renders a header and no rows for an empty ledger', () => {
    const csv = formatLedgerCsv(ledger([], { totalExpectedPaise: ZERO, totalPendingPaise: ZERO }), META);
    const lines = csv.split('\n');
    expect(lines).toContain('Period,From,To,Due date,Expected (Rs),Paid (Rs),Pending (Rs),Status');
    expect(lines.some(l => l.startsWith('TOTAL'))).toBe(true);
    expect(lines.some(l => l.startsWith('CREDIT'))).toBe(false);
  });

  it('renders a pending period row with plain decimal amounts', () => {
    const csv = formatLedgerCsv(ledger([row()]), META);
    expect(csv).toContain('2026-03,1 Mar 2026,31 Mar 2026,5 Mar 2026,18000.00,0.00,18000.00,pending');
  });

  it('renders a fully paid row', () => {
    const paidRow = row({ paidPaise: rupees(18_000), pendingPaise: ZERO, status: 'paid' });
    const csv = formatLedgerCsv(ledger([paidRow], { totalPaidPaise: rupees(18_000), totalPendingPaise: ZERO }), META);
    expect(csv).toContain('18000.00,18000.00,0.00,paid');
  });

  it('adds a CREDIT row only when creditPaise is positive', () => {
    const csv = formatLedgerCsv(ledger([], { creditPaise: rupees(2_000) }), META);
    expect(csv).toContain('CREDIT (unapplied),,,,,2000.00,,');
  });

  it('escapes a tenant name containing a comma, even in the free-text header line', () => {
    // An un-escaped comma there would misparse as an extra column the
    // moment a spreadsheet opens this file — not just in the data rows.
    const csv = formatLedgerCsv(ledger([]), { ...META, tenantName: 'Rahul, Flat 2B' });
    expect(csv.split('\n')[0]).toBe('"Rent history for Rahul, Flat 2B"');
  });
});
