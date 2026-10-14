import type { RentPeriod } from '@domain/types';
import { rentPeriodDocSchema } from '../rentPeriod';

function rawRentPeriod(over: Record<string, unknown> = {}) {
  return {
    id: 't1_2026-03',
    tenancyId: 't1',
    ownerId: 'o1',
    tenantUserId: null,
    accessExpiresAt: null,
    key: '2026-03',
    from: '2026-03-12',
    to: '2026-03-31',
    dueDate: '2026-03-05',
    rentPaise: 1_800_000,
    lineItems: [{ label: 'Electricity', amountPaise: 50_000 }],
    expectedPaise: 1_850_000,
    paidPaise: 1_000_000,
    status: 'partial',
    ...over,
  };
}

describe('rentPeriodDocSchema', () => {
  it('parses a well-formed rent period document', () => {
    const parsed = rentPeriodDocSchema.parse(rawRentPeriod());
    expect(parsed.id).toBe('t1_2026-03');
    expect(parsed.lineItems).toHaveLength(1);
  });

  it('is usable anywhere a domain RentPeriod is expected', () => {
    const parsed = rentPeriodDocSchema.parse(rawRentPeriod());
    // Compile-time check: computeLedger takes readonly RentPeriod[].
    const asPeriod: RentPeriod = parsed;
    expect(asPeriod.expectedPaise).toBe(1_850_000);
  });

  it('rejects an unknown status', () => {
    expect(() => rentPeriodDocSchema.parse(rawRentPeriod({ status: 'overdue' }))).toThrow();
  });

  it('rejects a non-integer rentPaise', () => {
    expect(() => rentPeriodDocSchema.parse(rawRentPeriod({ rentPaise: 1800.5 }))).toThrow();
  });
});
