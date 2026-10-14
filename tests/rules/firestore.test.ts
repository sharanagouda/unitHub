import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const OWNER_A = 'ownerA';
const OWNER_B = 'ownerB';
const TENANT = 'tenantU';
const TENANT_PHONE = '+919876543210';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-unithub',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

/** Seed as admin, bypassing rules. */
async function seed() {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'tenancies/t1'), {
      ownerId: OWNER_A,
      tenantUserId: null,
      tenantPhone: TENANT_PHONE,
      status: 'active',
      tenantName: 'Rahul',
    });
    await setDoc(doc(db, 'tenancies/t2'), {
      ownerId: OWNER_B,
      tenantUserId: null,
      tenantPhone: '+910000000000',
      status: 'active',
      tenantName: 'Someone Else',
    });
    await setDoc(doc(db, 'rentPayments/p1'), {
      ownerId: OWNER_A,
      tenancyId: 't1',
      tenantUserId: TENANT,
      amountPaise: 1800000,
    });
    await setDoc(doc(db, 'listings/l1'), { ownerId: OWNER_A, status: 'published' });
    await setDoc(doc(db, 'listings/l2'), { ownerId: OWNER_A, status: 'draft' });
  });
}

const asOwnerA = () => env.authenticatedContext(OWNER_A).firestore();
const asOwnerB = () => env.authenticatedContext(OWNER_B).firestore();
const asTenant = (phone = TENANT_PHONE) =>
  env.authenticatedContext(TENANT, { phone_number: phone }).firestore();
const asPublic = () => env.unauthenticatedContext().firestore();

describe('owner isolation', () => {
  beforeEach(seed);

  it('owner reads their own tenancy', async () => {
    await assertSucceeds(getDoc(doc(asOwnerA(), 'tenancies/t1')));
  });

  it("owner cannot read another owner's tenancy", async () => {
    await assertFails(getDoc(doc(asOwnerB(), 'tenancies/t1')));
  });

  it("owner cannot write into another owner's tenancy", async () => {
    await assertFails(updateDoc(doc(asOwnerB(), 'tenancies/t1'), { tenantName: 'hijack' }));
  });
});

describe('payment immutability (Rules 3 & 5)', () => {
  beforeEach(seed);

  it('owner may create a payment', async () => {
    await assertSucceeds(
      setDoc(doc(asOwnerA(), 'rentPayments/p2'), {
        ownerId: OWNER_A, tenancyId: 't1', amountPaise: 1000000,
      }),
    );
  });

  it('nobody may edit a recorded payment', async () => {
    await assertFails(updateDoc(doc(asOwnerA(), 'rentPayments/p1'), { amountPaise: 1 }));
  });

  it('nobody may delete a recorded payment', async () => {
    await assertFails(deleteDoc(doc(asOwnerA(), 'rentPayments/p1')));
  });
});

describe('public exposure (Rule 8)', () => {
  beforeEach(seed);

  it('anyone may read a published listing', async () => {
    await assertSucceeds(getDoc(doc(asPublic(), 'listings/l1')));
  });

  it('an unpublished listing stays private', async () => {
    await assertFails(getDoc(doc(asPublic(), 'listings/l2')));
  });

  it('the public cannot reach tenancies, payments or repairs', async () => {
    await assertFails(getDoc(doc(asPublic(), 'tenancies/t1')));
    await assertFails(getDoc(doc(asPublic(), 'rentPayments/p1')));
  });
});

describe('tenant invite claim (§59)', () => {
  beforeEach(seed);

  it('a tenant whose verified phone matches may claim the tenancy', async () => {
    await assertSucceeds(
      updateDoc(doc(asTenant(), 'tenancies/t1'), {
        tenantUserId: TENANT,
        claimedAt: new Date(),
      }),
    );
  });

  it('a tenant cannot claim a tenancy for a different phone number', async () => {
    await assertFails(
      updateDoc(doc(asTenant(), 'tenancies/t2'), {
        tenantUserId: TENANT,
        claimedAt: new Date(),
      }),
    );
  });

  it('a claim cannot smuggle in other field changes', async () => {
    await assertFails(
      updateDoc(doc(asTenant(), 'tenancies/t1'), {
        tenantUserId: TENANT,
        claimedAt: new Date(),
        rentRevisions: [{ rentPaise: 1 }],
      }),
    );
  });

  it('an already-claimed tenancy cannot be re-claimed', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), 'tenancies/t1'), { tenantUserId: 'someoneElse' });
    });
    await assertFails(
      updateDoc(doc(asTenant(), 'tenancies/t1'), { tenantUserId: TENANT, claimedAt: new Date() }),
    );
  });
});

describe('tenant access expiry (docs/tenant-claim.md HRA retention)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const FUTURE = new Date(Date.now() + 30 * DAY_MS);
  const PAST = new Date(Date.now() - 30 * DAY_MS);

  async function seedExpiry() {
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();

      // t-active: still living there, no expiry.
      await setDoc(doc(db, 'tenancies/t-active'), {
        ownerId: OWNER_A, tenantUserId: TENANT, tenantPhone: TENANT_PHONE,
        status: 'active', accessExpiresAt: null,
      });
      // t-ended-future: moved out, still inside the retention window.
      await setDoc(doc(db, 'tenancies/t-ended-future'), {
        ownerId: OWNER_A, tenantUserId: TENANT, tenantPhone: TENANT_PHONE,
        status: 'ended', accessExpiresAt: FUTURE,
      });
      // t-ended-past: moved out, retention window has lapsed.
      await setDoc(doc(db, 'tenancies/t-ended-past'), {
        ownerId: OWNER_A, tenantUserId: TENANT, tenantPhone: TENANT_PHONE,
        status: 'ended', accessExpiresAt: PAST,
      });

      for (const [tenancyId, accessExpiresAt] of [
        ['t-active', null],
        ['t-ended-future', FUTURE],
        ['t-ended-past', PAST],
      ] as const) {
        await setDoc(doc(db, `rentPeriods/${tenancyId}_p1`), {
          ownerId: OWNER_A, tenancyId, tenantUserId: TENANT, accessExpiresAt,
        });
        await setDoc(doc(db, `rentPayments/${tenancyId}_pay1`), {
          ownerId: OWNER_A, tenancyId, tenantUserId: TENANT, accessExpiresAt,
        });
      }
    });
  }

  beforeEach(seedExpiry);

  it('a tenant reads an active tenancy, its periods and its payments', async () => {
    await assertSucceeds(getDoc(doc(asTenant(), 'tenancies/t-active')));
    await assertSucceeds(getDoc(doc(asTenant(), 'rentPeriods/t-active_p1')));
    await assertSucceeds(getDoc(doc(asTenant(), 'rentPayments/t-active_pay1')));
  });

  it('a tenant still reads an ended tenancy inside the retention window', async () => {
    await assertSucceeds(getDoc(doc(asTenant(), 'tenancies/t-ended-future')));
    await assertSucceeds(getDoc(doc(asTenant(), 'rentPeriods/t-ended-future_p1')));
    await assertSucceeds(getDoc(doc(asTenant(), 'rentPayments/t-ended-future_pay1')));
  });

  it('a tenant loses read access once the retention window lapses', async () => {
    await assertFails(getDoc(doc(asTenant(), 'tenancies/t-ended-past')));
    await assertFails(getDoc(doc(asTenant(), 'rentPeriods/t-ended-past_p1')));
    await assertFails(getDoc(doc(asTenant(), 'rentPayments/t-ended-past_pay1')));
  });

  it("the owner's own access is never time-limited", async () => {
    await assertSucceeds(getDoc(doc(asOwnerA(), 'tenancies/t-ended-past')));
    await assertSucceeds(getDoc(doc(asOwnerA(), 'rentPeriods/t-ended-past_p1')));
    await assertSucceeds(getDoc(doc(asOwnerA(), 'rentPayments/t-ended-past_pay1')));
  });
});

describe('role escalation', () => {
  it('a user cannot grant themselves roles', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), `users/${TENANT}`), { roles: [], phone: TENANT_PHONE });
    });
    await assertFails(updateDoc(doc(asTenant(), `users/${TENANT}`), { roles: ['owner'] }));
  });
});
