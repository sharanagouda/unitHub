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

describe('role escalation', () => {
  it('a user cannot grant themselves roles', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), `users/${TENANT}`), { roles: [], phone: TENANT_PHONE });
    });
    await assertFails(updateDoc(doc(asTenant(), `users/${TENANT}`), { roles: ['owner'] }));
  });
});
