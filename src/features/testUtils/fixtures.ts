/** Plain-object fixtures for component tests — bypass zod entirely (the
 *  fake Firestore in fakeFirestore.ts hands these straight to components,
 *  the way a real `withConverter().fromFirestore()` would after parsing). */

export function fakeTenancy(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    ownerId: 'owner1',
    unitId: 'unit1',
    tenantUserId: 'tenant1',
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
    createdAt: { toDate: () => new Date('2026-03-01') },
    inviteToken: null,
    inviteSentAt: null,
    claimedAt: { toDate: () => new Date('2026-03-15') },
    accessExpiresAt: null,
    ...over,
  };
}

export function fakeRentPeriod(over: Record<string, unknown> = {}) {
  return {
    id: 't1_2026-03',
    tenancyId: 't1',
    ownerId: 'owner1',
    tenantUserId: 'tenant1',
    accessExpiresAt: null,
    key: '2026-03',
    from: '2026-03-01',
    to: '2026-03-31',
    dueDate: '2026-03-05',
    rentPaise: 1_800_000,
    lineItems: [],
    expectedPaise: 1_800_000,
    paidPaise: 0,
    status: 'pending',
    ...over,
  };
}

export function fakePayment(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    tenancyId: 't1',
    ownerId: 'owner1',
    tenantUserId: 'tenant1',
    accessExpiresAt: null,
    amountPaise: 1_800_000,
    paidOn: '2026-03-05',
    method: 'upi',
    allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 1_800_000 }],
    ...over,
  };
}
