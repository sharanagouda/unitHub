import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { generateInviteToken } from './lib/inviteToken';
import { db } from './lib/admin';

interface CreateTenantInviteData {
  tenancyId: string;
}

function isCreateTenantInviteData(data: unknown): data is CreateTenantInviteData {
  return typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).tenancyId === 'string';
}

/**
 * Owner-side step 2 of docs/tenant-claim.md: mints an invite token and
 * returns it so the owner's client can compose the share link. Sending the
 * SMS/link itself is the OS share sheet, not this function — there is no
 * SMS provider in this app.
 */
export const createTenantInvite = onCall<CreateTenantInviteData>(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }
  if (!isCreateTenantInviteData(request.data)) {
    throw new HttpsError('invalid-argument', 'tenancyId is required.');
  }

  const { tenancyId } = request.data;
  const tenancyRef = db.collection('tenancies').doc(tenancyId);
  const tenancySnap = await tenancyRef.get();

  if (!tenancySnap.exists) {
    throw new HttpsError('not-found', 'Tenancy not found.');
  }
  const tenancy = tenancySnap.data()!;

  if (tenancy.ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'You do not own this tenancy.');
  }
  if (tenancy.status !== 'active') {
    throw new HttpsError('failed-precondition', 'This tenancy is not active.');
  }
  if (tenancy.tenantUserId) {
    throw new HttpsError('failed-precondition', 'This tenancy is already claimed.');
  }

  const inviteToken = generateInviteToken();
  await tenancyRef.update({ inviteToken, inviteSentAt: FieldValue.serverTimestamp() });

  return { tenancyId, inviteToken };
});
