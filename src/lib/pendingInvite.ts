import { create } from 'zustand';

export interface PendingInvite {
  tenancyId: string;
  inviteToken?: string;
}

interface PendingInviteState {
  invite: PendingInvite | null;
  setInvite: (invite: PendingInvite | null) => void;
}

/**
 * Holds an invite captured from a deep link (see useDeepLinkInvite.ts) until
 * sign-in completes — the tenancy doc itself is unreadable pre-claim
 * (firestore.rules), so there's nothing to look up until then. Consumed and
 * cleared by useAuthBootstrap.ts.
 */
export const usePendingInviteStore = create<PendingInviteState>(set => ({
  invite: null,
  setInvite: invite => set({ invite }),
}));
