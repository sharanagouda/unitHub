import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signOut } from '@react-native-firebase/auth';
import { asUserId } from '@domain/ids';
import { tenanciesByOwner } from '@data/refs';
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

type Props = NativeStackScreenProps<AppStackParamList, 'OwnerHome'> & {
  uid: string;
  canSwitchToTenant: boolean;
  onSwitchRole: () => void;
};

export function OwnerHomeScreen({ navigation, uid, canSwitchToTenant, onSwitchRole }: Props) {
  const theme = useTheme();
  const query = useMemo(() => tenanciesByOwner(asUserId(uid)), [uid]);
  const { data: tenancies, loading, error } = useCollection(query);

  if (loading && tenancies.length === 0) {
    return <CenteredMessage text="Loading your tenancies…" />;
  }
  if (error) {
    return <CenteredMessage text={`Couldn't load your tenancies: ${error.message}`} />;
  }

  const footerStyle = { marginTop: theme.spacing.md, gap: theme.spacing.sm };
  const headerStyle = { marginBottom: theme.spacing.md };

  return (
    <Screen>
      <View style={[styles.header, headerStyle]}>
        <ThemedText variant="title">Tenancies</ThemedText>
        <ThemeToggle />
      </View>

      <TenancyListView
        tenancies={tenancies}
        onSelect={tenancyId => navigation.navigate('Ledger', { tenancyId })}
        emptyTitle="No tenancies yet"
        emptyMessage="Tenancies you create will show up here."
      />

      <View style={footerStyle}>
        {canSwitchToTenant ? (
          <ThemedButton title="Switch to tenant view" onPress={onSwitchRole} variant="secondary" />
        ) : null}
        <ThemedButton title="Sign out" onPress={() => signOut(authInstance())} variant="danger" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
