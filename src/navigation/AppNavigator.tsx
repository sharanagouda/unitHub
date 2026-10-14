import { useMemo, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from '@react-native-firebase/auth';
import { asUserId } from '@domain/ids';
import { userDocRef } from '@data/refs';
import { useDoc } from '@data/hooks/useDoc';
import { LedgerScreen } from '@features/tenancy/LedgerScreen';
import { OwnerHomeScreen } from '@features/owner/OwnerHomeScreen';
import { TenantHomeScreen } from '@features/tenant/TenantHomeScreen';
import { CenteredMessage } from './CenteredMessage';
import type { AppStackParamList } from './types';

type Role = 'owner' | 'tenant';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Role resolution (loading / zero-roles / dual-role switch) is unchanged
 * from before this screen became a real navigator — only the leaf render
 * changed, from swapping bare screens to a native-stack with a Ledger
 * screen both roles can navigate into.
 *
 * Each branch's Stack.Navigator carries a `key` so switching roles unmounts
 * and remounts the other stack rather than preserving its navigation
 * state — switching into a role should land you on that role's home, not
 * wherever you last left it.
 */
export function AppNavigator({ user }: { user: User }) {
  const uid = user.uid;
  const ref = useMemo(() => userDocRef(asUserId(uid)), [uid]);
  const { data: userDoc, loading } = useDoc(ref);
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  if (loading && !userDoc) {
    return <CenteredMessage text="Loading your account…" />;
  }

  const roles = userDoc?.roles ?? [];
  if (roles.length === 0) {
    // Reachable only if the bootstrap write (useAuthBootstrap) hasn't
    // landed yet, or roles were ever cleared server-side — a self-serve
    // sign-in always gets at least 'owner' (docs/DECISIONS.md).
    return <CenteredMessage text="No rental linked yet. Ask your owner to invite you from UnitHub." />;
  }

  const canSwitch = roles.includes('owner') && roles.includes('tenant');
  const role: Role = activeRole ?? (roles.includes('owner') ? 'owner' : 'tenant');

  return role === 'owner' ? (
    <Stack.Navigator key="owner">
      <Stack.Screen name="OwnerHome" options={{ title: 'Your tenancies' }}>
        {props => (
          <OwnerHomeScreen
            {...props}
            uid={uid}
            canSwitchToTenant={canSwitch}
            onSwitchRole={() => setActiveRole('tenant')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Ledger" component={LedgerScreen} options={{ title: 'Rent ledger' }} />
    </Stack.Navigator>
  ) : (
    <Stack.Navigator key="tenant">
      <Stack.Screen name="TenantHome" options={{ title: 'Your tenancies' }}>
        {props => (
          <TenantHomeScreen
            {...props}
            uid={uid}
            canSwitchToOwner={canSwitch}
            onSwitchRole={() => setActiveRole('owner')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Ledger" component={LedgerScreen} options={{ title: 'Rent ledger' }} />
    </Stack.Navigator>
  );
}
