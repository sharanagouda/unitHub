import { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { asTenancyId } from '@domain/ids';
import { todayIST, periodKeyLabel } from '@domain/dates';
import { formatINR, type Paise } from '@domain/money';
import { computeLedger } from '@domain/rent/ledger';
import { formatLedgerCsv } from '@domain/export/csv';
import { formatPeriodStatement, METHOD_LABEL } from '@domain/export/statement';
import type { Payment, PeriodLedgerRow, RentPeriodStatus } from '@domain/types';
import { rentPaymentsByTenancy, rentPeriodsByTenancy, tenancyDocRef } from '@data/refs';
import { useCollection } from '@data/hooks/useCollection';
import { useDoc } from '@data/hooks/useDoc';
import type { AppStackParamList } from '@navigation/types';
import { CenteredMessage } from '@navigation/CenteredMessage';
import { useTheme } from '@ui/ThemeProvider';
import { Badge, type BadgeTone } from '@ui/components/Badge';
import { Card } from '@ui/components/Card';
import { EmptyState } from '@ui/components/EmptyState';
import { ListRow } from '@ui/components/ListRow';
import { Screen } from '@ui/components/Screen';
import { ThemedButton } from '@ui/components/ThemedButton';
import { ThemedText } from '@ui/components/ThemedText';

type Props = NativeStackScreenProps<AppStackParamList, 'Ledger'>;

const STATUS_BADGE: Record<RentPeriodStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  partial: { label: 'Partial', tone: 'warning' },
  pending: { label: 'Pending', tone: 'danger' },
};

/** "Cash", "UPI", "Cash + UPI" — a quick-glance hint of how a period was
 *  paid, without opening its statement. Empty when nothing's been paid yet. */
function methodSummary(row: PeriodLedgerRow, payments: readonly Payment[]): string | undefined {
  const methods = new Set(
    payments.filter(p => p.allocations.some(a => a.rentPeriodId === row.period.id)).map(p => p.method),
  );
  if (methods.size === 0) return undefined;
  return [...methods].map(m => METHOD_LABEL[m]).join(' + ');
}

export function LedgerScreen({ route }: Props) {
  const theme = useTheme();
  const tenancyId = useMemo(() => asTenancyId(route.params.tenancyId), [route.params.tenancyId]);

  const tenancyRef = useMemo(() => tenancyDocRef(tenancyId), [tenancyId]);
  const periodsQuery = useMemo(() => rentPeriodsByTenancy(tenancyId), [tenancyId]);
  const paymentsQuery = useMemo(() => rentPaymentsByTenancy(tenancyId), [tenancyId]);

  const { data: tenancy, loading: tenancyLoading, error: tenancyError } = useDoc(tenancyRef);
  const { data: periods, loading: periodsLoading, error: periodsError } = useCollection(periodsQuery);
  const { data: payments, loading: paymentsLoading, error: paymentsError } = useCollection(paymentsQuery);

  const loading = tenancyLoading || periodsLoading || paymentsLoading;
  const error = tenancyError ?? periodsError ?? paymentsError;

  if (loading && !tenancy) {
    return <CenteredMessage text="Loading ledger…" />;
  }
  if (error) {
    return <CenteredMessage text={`Couldn't load this ledger: ${error.message}`} />;
  }
  if (!tenancy) {
    return <CenteredMessage text="This tenancy no longer exists." />;
  }

  const ledger = computeLedger(periods, payments);

  const tenantName = tenancy.tenantName;

  function handleExport() {
    const csv = formatLedgerCsv(ledger, { tenantName, generatedOn: todayIST() });
    Share.share({ message: csv, title: `Rent history - ${tenantName}` }).catch(() => {});
  }

  function handleShareStatement(row: PeriodLedgerRow) {
    const text = formatPeriodStatement(row, payments, { tenantName });
    Share.share({ message: text, title: `Rent statement - ${periodKeyLabel(row.period.key)}` }).catch(() => {});
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <ThemedText variant="subtitle">{tenancy.tenantName}</ThemedText>
          <TotalsRow label="Expected" amountPaise={ledger.totalExpectedPaise} />
          <TotalsRow label="Paid" amountPaise={ledger.totalPaidPaise} />
          <TotalsRow
            label="Pending"
            amountPaise={ledger.totalPendingPaise}
            color={ledger.totalPendingPaise > 0 ? theme.colors.danger : theme.colors.text}
          />
          {ledger.creditPaise > 0 ? (
            <TotalsRow label="Credit (unapplied)" amountPaise={ledger.creditPaise} color={theme.colors.credit} />
          ) : null}
          <View style={{ marginTop: theme.spacing.md }}>
            <ThemedButton title="Export history" onPress={handleExport} variant="secondary" />
          </View>
        </Card>

        {ledger.rows.length === 0 ? (
          <EmptyState title="No rent periods yet" message="Periods appear here once the tenancy is active." />
        ) : (
          ledger.rows.map(row => {
            const badge = STATUS_BADGE[row.status];
            const subtitle = methodSummary(row, payments);
            return (
              <ListRow
                key={row.period.id}
                title={periodKeyLabel(row.period.key)}
                {...(subtitle !== undefined ? { subtitle } : {})}
                trailing={
                  <View style={styles.trailingColumn}>
                    <ThemedText variant="body">{formatINR(row.paidPaise)}</ThemedText>
                    <Badge label={badge.label} tone={badge.tone} />
                    <Pressable onPress={() => handleShareStatement(row)} hitSlop={8}>
                      <ThemedText variant="label" style={{ color: theme.colors.primary }}>
                        Share
                      </ThemedText>
                    </Pressable>
                  </View>
                }
              />
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function TotalsRow({ label, amountPaise, color }: { label: string; amountPaise: Paise; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.totalsRow}>
      <ThemedText variant="muted">{label}</ThemedText>
      <ThemedText variant="body" style={{ color: color ?? theme.colors.text }}>
        {formatINR(amountPaise)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  trailingColumn: { alignItems: 'flex-end', gap: 4 },
});
