import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signOut } from '@react-native-firebase/auth';
import { asUserId } from '@domain/ids';
import { tenanciesByTenant } from '@data/refs';
import { useCollection } from '@data/hooks/useCollection';
import { authInstance } from '@lib/auth';
import { CenteredMessage } from '@navigation/CenteredMessage';
import type { AppStackParamList } from '@navigation/types';
import { useTheme } from '@ui/ThemeProvider';
import { Screen } from '@ui/components/Screen';
import { ThemedButton } from '@ui/components/ThemedButton';
import { ThemedText } from '@ui/components/ThemedText';
import { ThemeToggle } from '@ui/components/ThemeToggle';
import { TenancyListView } from '@features/tenancy/TenancyListView';

type Props = NativeStackScreenProps<AppStackParamList, 'TenantHome'> & {
  uid: string;
  canSwitchToOwner: boolean;
  onSwitchRole: () => void;
};

/**
 * One tenancy auto-navigates straight to its ledger; 2+ shows the list as a
 * unit switcher (docs/tenant-claim.md: "one phone, two units → unit
 * switcher"). Zero shows the doc's own empty-state copy verbatim.
 */
export function TenantHomeScreen({ navigation, uid, canSwitchToOwner, onSwitchRole }: Props) {
  const theme = useTheme();
  const query = useMemo(() => tenanciesByTenant(asUserId(uid)), [uid]);
  const { data: tenancies, loading, error } = useCollection(query);

  useEffect(() => {
    if (tenancies.length !== 1) return;
    const only = tenancies[0];
    if (only) navigation.replace('Ledger', { tenancyId: only.id });
  }, [tenancies, navigation]);

  if (loading && tenancies.length === 0) {
    return <CenteredMessage text="Loading your tenancies…" />;
  }
  if (error) {
    return <CenteredMessage text={`Couldn't load your tenancies: ${error.message}`} />;
  }
  if (tenancies.length === 1) {
    // The effect above is mid-navigate; avoid a flash of the list view.
    return <CenteredMessage text="Loading your ledger…" />;
  }

  const footerStyle = { marginTop: theme.spacing.md, gap: theme.spacing.sm };
  const headerStyle = { marginBottom: theme.spacing.md };

  return (
    <Screen>
      <View style={[styles.header, headerStyle]}>
        <ThemedText variant="title">Your tenancies</ThemedText>
        <ThemeToggle />
      </View>

      <TenancyListView
        tenancies={tenancies}
        onSelect={tenancyId => navigation.navigate('Ledger', { tenancyId })}
        emptyTitle="No rental linked yet"
        emptyMessage="Ask your owner to invite you from UnitHub."
      />

      <View style={footerStyle}>
        {canSwitchToOwner ? (
          <ThemedButton title="Switch to owner view" onPress={onSwitchRole} variant="secondary" />
        ) : null}
        <ThemedButton title="Sign out" onPress={() => signOut(authInstance())} variant="danger" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
