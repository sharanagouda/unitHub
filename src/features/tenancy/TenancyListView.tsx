import { ScrollView } from 'react-native';
import type { TenancyDoc } from '@data/schemas/tenancy';
import { Badge } from '@ui/components/Badge';
import { EmptyState } from '@ui/components/EmptyState';
import { ListRow } from '@ui/components/ListRow';

interface Props {
  tenancies: readonly TenancyDoc[];
  onSelect: (tenancyId: string) => void;
  emptyTitle: string;
  emptyMessage?: string;
}

/**
 * Presentational — no Firestore awareness. Shared by the owner's tenancy
 * list and the tenant's 2+ tenancy switcher (docs/tenant-claim.md's "one
 * phone, two units" case). Shows active *and* ended tenancies — the
 * ~12-month HRA retention (docs/DECISIONS.md #10) means an ended one is
 * still worth seeing, just tagged.
 */
export function TenancyListView({ tenancies, onSelect, emptyTitle, emptyMessage }: Props) {
  if (tenancies.length === 0) {
    return <EmptyState title={emptyTitle} {...(emptyMessage !== undefined ? { message: emptyMessage } : {})} />;
  }

  return (
    <ScrollView>
      {tenancies.map(t => (
        <ListRow
          key={t.id}
          title={t.tenantName}
          subtitle={t.status === 'ended' ? 'Ended tenancy' : 'Active'}
          trailing={t.status === 'ended' ? <Badge label="Ended" tone="neutral" /> : undefined}
          onPress={() => onSelect(t.id)}
        />
      ))}
    </ScrollView>
  );
}
