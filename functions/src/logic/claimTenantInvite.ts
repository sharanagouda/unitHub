import type { FunctionsErrorCode } from 'firebase-functions/v2/https';

/**
 * The decision tree behind "can this signed-in phone claim this tenancy",
 * kept pure and Firestore-free — same reasoning as this repo's
 * `src/domain`: a security decision this central should be unit-testable
 * without an emulator, and the handler in `../claimTenantInvite.ts` is the
 * only place that touches Firestore or throws an HttpsError.
 *
 * Each branch below is one row of docs/tenant-claim.md's edge-case table.
 */

const RECYCLED_NUMBER_GRACE_DAYS = 30;
const INVITE_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ClaimInput {
  /** request.auth.token.phone_number — undefined if phone auth wasn't used. */
  callerPhone: string | undefined;
  /** Query param from the invite link, if the client sent one. */
  inviteToken: string | undefined;
  now: Date;
}

export interface TenancySnapshot {
  status: string;
  tenantUserId: string | null;
  tenantPhone: string;
  createdAt: Date;
  inviteToken: string | null;
  inviteSentAt: Date | null;
}

export interface ClaimError {
  code: FunctionsErrorCode;
  message: string;
}

export type ClaimDecision = { ok: true } | { ok: false; error: ClaimError };

function daysSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / MS_PER_DAY;
}

export function evaluateClaim(input: ClaimInput, tenancy: TenancySnapshot | null): ClaimDecision {
  if (!input.callerPhone) {
    return {
      ok: false,
      error: { code: 'failed-precondition', message: 'Sign in with a verified phone number first.' },
    };
  }

  if (!tenancy) {
    return { ok: false, error: { code: 'not-found', message: 'This invite no longer exists.' } };
  }

  if (tenancy.status !== 'active') {
    return { ok: false, error: { code: 'failed-precondition', message: 'This tenancy is no longer active.' } };
  }

  // Rules also enforce this (tenancies/{id}'s claim rule requires
  // resource.data.tenantUserId == null), but the callable is the primary
  // path — see docs/tenant-claim.md's "already-claimed" case.
  if (tenancy.tenantUserId !== null) {
    return { ok: false, error: { code: 'already-exists', message: 'This invite has already been claimed.' } };
  }

  if (tenancy.tenantPhone !== input.callerPhone) {
    return {
      ok: false,
      error: {
        code: 'permission-denied',
        message:
          'Your phone number does not match the number on this tenancy. ' +
          'Ask your owner to check it and resend the invite.',
      },
    };
  }

  // Recycled-number safety: a tenancy old enough that its phone number could
  // plausibly have been reassigned to someone else requires the invite
  // token, not just a phone match. A fresh tenancy can be claimed by phone
  // match alone. If a token was supplied anyway, validate it regardless —
  // defense in depth costs nothing here.
  const tenancyAgeDays = daysSince(tenancy.createdAt, input.now);
  const tokenRequired = tenancyAgeDays > RECYCLED_NUMBER_GRACE_DAYS || input.inviteToken !== undefined;

  if (tokenRequired) {
    if (!input.inviteToken || !tenancy.inviteToken) {
      return {
        ok: false,
        error: { code: 'failed-precondition', message: 'This invite needs a fresh link. Ask your owner to resend it.' },
      };
    }
    if (input.inviteToken !== tenancy.inviteToken) {
      return { ok: false, error: { code: 'permission-denied', message: 'Invalid invite link.' } };
    }
    if (!tenancy.inviteSentAt || daysSince(tenancy.inviteSentAt, input.now) > INVITE_EXPIRY_DAYS) {
      return {
        ok: false,
        error: { code: 'failed-precondition', message: 'This invite link has expired. Ask your owner to resend it.' },
      };
    }
  }

  return { ok: true };
}
