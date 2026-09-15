import type { Tenancy } from '@domain/types';
import { tenancyDocSchema } from '../tenancy';

const fakeTimestamp = (d: string) => ({ toDate: () => new Date(d) });

function rawTenancy(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    ownerId: 'o1',
    unitId: 'u1',
    tenantUserId: null,
    tenantName: 'Rahul',
    tenantPhone: '+919876543210',
    moveInDate: '2026-03-12',
    moveOutDate: null,
    status: 'active',
    rentRevisions: [{ effectiveFrom: '2026-03-12', rentPaise: 1_800_000 }],
    dueDay: 5,
    depositPaise: 6_000_00,
    cycle: 'calendar-month',
    proration: 'full-month',
    createdAt: fakeTimestamp('2026-03-01'),
    inviteToken: null,
    inviteSentAt: null,
    claimedAt: null,
    ...over,
  };
}

describe('tenancyDocSchema', () => {
  it('parses a well-formed tenancy document', () => {
    const parsed = tenancyDocSchema.parse(rawTenancy());
    expect(parsed.id).toBe('t1');
    expect(parsed.rentRevisions[0]?.rentPaise).toBe(1_800_000);
  });

  it('is usable anywhere a domain Tenancy is expected', () => {
    const parsed = tenancyDocSchema.parse(rawTenancy());
    // Compile-time check: a TenancyDoc must be a structural superset of the
    // domain Tenancy, since generateRentPeriods/rentOn take a Tenancy.
    const asTenancy: Tenancy = parsed;
    expect(asTenancy.moveInDate).toBe('2026-03-12');
  });

  it('accepts a claimed tenancy with a Timestamp-like claimedAt', () => {
    const parsed = tenancyDocSchema.parse(
      rawTenancy({ tenantUserId: 'tenant1', claimedAt: fakeTimestamp('2026-04-01') }),
    );
    expect(parsed.tenantUserId).toBe('tenant1');
    expect(parsed.claimedAt?.toDate()).toEqual(new Date('2026-04-01'));
  });

  it('accepts a pending invite with an inviteToken and inviteSentAt', () => {
    const parsed = tenancyDocSchema.parse(
      rawTenancy({ inviteToken: 'tok123', inviteSentAt: fakeTimestamp('2026-03-10') }),
    );
    expect(parsed.inviteToken).toBe('tok123');
    expect(parsed.inviteSentAt?.toDate()).toEqual(new Date('2026-03-10'));
  });

  it('rejects a tenancy missing createdAt', () => {
    const raw = rawTenancy();
    delete (raw as Record<string, unknown>).createdAt;
    expect(() => tenancyDocSchema.parse(raw)).toThrow();
  });

  it('rejects an out-of-range dueDay', () => {
    expect(() => tenancyDocSchema.parse(rawTenancy({ dueDay: 32 }))).toThrow();
  });

  it('rejects a malformed date', () => {
    expect(() => tenancyDocSchema.parse(rawTenancy({ moveInDate: '12-03-2026' }))).toThrow();
  });

  it('rejects a claimedAt that is not Timestamp-like', () => {
    expect(() => tenancyDocSchema.parse(rawTenancy({ claimedAt: '2026-04-01' }))).toThrow();
  });
});
