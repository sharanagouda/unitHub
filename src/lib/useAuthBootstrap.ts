import { useEffect, useState } from 'react';
import { getDoc, setDoc } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';
import { asUserId } from '@domain/ids';
import { userDocRef } from '@data/refs';
import { claimTenantInvite } from './functions';
import { usePendingInviteStore } from './pendingInvite';

export type BootstrapStatus =
  | { phase: 'idle' | 'running' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

/**
 * Runs once per sign-in, before any role-based routing:
 *
 *  - a captured invite link (usePendingInviteStore) always wins — it calls
 *    claimTenantInvite, which grants the tenant role regardless of whether
 *    the caller already has a user doc (docs/tenant-claim.md's "owner is
 *    also a tenant" case falls out of this for free, via arrayUnion).
 *  - otherwise, a brand new user self-serves into the owner role (see
 *    docs/DECISIONS.md — the only way to become a tenant is via an invite;
 *    a bare sign-in with no invite always becomes an owner).
 *  - an existing user with a doc already and no pending invite needs no
 *    write at all.
 */
export function useAuthBootstrap(user: User | null): BootstrapStatus {
  const [status, setStatus] = useState<BootstrapStatus>({ phase: 'idle' });
  const invite = usePendingInviteStore(s => s.invite);
  const setInvite = usePendingInviteStore(s => s.setInvite);

  useEffect(() => {
    if (!user) {
      setStatus({ phase: 'idle' });
      return;
    }

    let cancelled = false;
    setStatus({ phase: 'running' });

    (async () => {
      try {
        if (invite) {
          // Spread conditionally rather than `inviteToken: invite.inviteToken`
          // — under exactOptionalPropertyTypes, assigning a possibly-undefined
          // value still types as "key present with value undefined", not
          // "key absent", which ClaimTenantInviteRequest's optional field
          // rejects.
          await claimTenantInvite({
            tenancyId: invite.tenancyId,
            ...(invite.inviteToken !== undefined ? { inviteToken: invite.inviteToken } : {}),
          });
          if (!cancelled) setInvite(null);
        } else {
          const uid = asUserId(user.uid);
          const ref = userDocRef(uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, { id: uid, roles: ['owner'], phone: user.phoneNumber ?? '' });
          }
        }
        if (!cancelled) setStatus({ phase: 'ready' });
      } catch (err) {
        if (!cancelled) {
          setStatus({ phase: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Depend on user?.uid, not `user` itself — onAuthStateChanged isn't
    // guaranteed to hand back the same object reference for an unchanged
    // signed-in user, and that would re-run this on every emission. invite
    // is read once per sign-in; re-running after setInvite(null) clears it
    // is a harmless no-op (the else branch's getDoc short-circuits on the
    // doc claimTenantInvite just wrote).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, invite]);

  return status;
}
