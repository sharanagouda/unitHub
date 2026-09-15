import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './lib/admin';
import { evaluateClaim, type TenancySnapshot } from './logic/claimTenantInvite';

interface ClaimTenantInviteData {
  tenancyId: string;
  inviteToken?: string;
}

function isClaimTenantInviteData(data: unknown): data is ClaimTenantInviteData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.tenancyId === 'string' && (d.inviteToken === undefined || typeof d.inviteToken === 'string');
}

function toTenancySnapshot(data: DocumentData): TenancySnapshot {
  const inviteSentAt = data.inviteSentAt as Timestamp | null | undefined;
  return {
    status: data.status as string,
    tenantUserId: (data.tenantUserId as string | null) ?? null,
    tenantPhone: data.tenantPhone as string,
    createdAt: (data.createdAt as Timestamp).toDate(),
    inviteToken: (data.inviteToken as string | null) ?? null,
    inviteSentAt: inviteSentAt ? inviteSentAt.toDate() : null,
  };
}

/**
 * The primary entry point for docs/tenant-claim.md's step 4. The client
 * reaches this with the tenancyId + inviteToken it read out of the invite
 * link — the tenancy document itself is unreadable to the tenant until
 * claimed (firestore.rules), so there is nothing to look up first.
 */
export const claimTenantInvite = onCall<ClaimTenantInviteData>(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }
  if (!isClaimTenantInviteData(request.data)) {
    throw new HttpsError('invalid-argument', 'tenancyId is required.');
  }

  const { tenancyId, inviteToken } = request.data;
  const uid = request.auth.uid;
  const callerPhone = request.auth.token.phone_number;
  const now = new Date();
  const tenancyRef = db.collection('tenancies').doc(tenancyId);

  const result = await db.runTransaction(async tx => {
    // Re-read inside the transaction: two devices claiming the same invite
    // at once must not both succeed.
    const tenancySnap = await tx.get(tenancyRef);
    const tenancyData = tenancySnap.exists ? tenancySnap.data() : undefined;

    const decision = evaluateClaim(
      { callerPhone, inviteToken, now },
      tenancyData ? toTenancySnapshot(tenancyData) : null,
    );

    if (!decision.ok) {
      return decision;
    }
    // evaluateClaim only returns ok:true when it was given a non-null
    // tenancy, so tenancyData is guaranteed here.
    const data = tenancyData!;

    const userRef = db.collection('users').doc(uid);
    const auditRef = db.collection('auditEvents').doc();

    tx.update(tenancyRef, { tenantUserId: uid, claimedAt: FieldValue.serverTimestamp() });
    tx.set(userRef, { roles: FieldValue.arrayUnion('tenant'), phone: callerPhone }, { merge: true });
    tx.set(auditRef, {
      ownerId: data.ownerId as string,
      tenancyId,
      type: 'tenant_claimed',
      actorUid: uid,
      at: FieldValue.serverTimestamp(),
    });

    return { ok: true as const, unitId: data.unitId as string };
  });

  if (!result.ok) {
    throw new HttpsError(result.error.code, result.error.message);
  }

  return { tenancyId, unitId: result.unitId };
});
