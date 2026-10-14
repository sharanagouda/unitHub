import { useEffect } from 'react';
import { Linking } from 'react-native';
import { parseInviteUrl } from './inviteLink';
import { usePendingInviteStore } from './pendingInvite';

/**
 * Captures an invite link whether the app was already running (`url` event)
 * or launched cold by tapping one (`getInitialURL`), and stashes it in
 * usePendingInviteStore until sign-in completes. Mount once, near the root.
 */
export function useDeepLinkInvite(): void {
  const setInvite = usePendingInviteStore(s => s.setInvite);

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (!url) return;
      const invite = parseInviteUrl(url);
      if (invite) setInvite(invite);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const invite = parseInviteUrl(url);
      if (invite) setInvite(invite);
    });

    return () => subscription.remove();
  }, [setInvite]);
}
