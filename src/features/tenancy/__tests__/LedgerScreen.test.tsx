import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Share } from 'react-native';
import { onSnapshot } from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/types';
import { ThemeProvider } from '@ui/ThemeProvider';
import { Badge } from '@ui/components/Badge';
import { ThemedText } from '@ui/components/ThemedText';
import { installFakeFirestore } from '../../testUtils/fakeFirestore';
import { fakePayment, fakeRentPeriod, fakeTenancy } from '../../testUtils/fixtures';
import { LedgerScreen } from '../LedgerScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'Ledger'>;

function renderLedger(tenancyId: string): ReactTestRenderer {
  const route = { key: 'Ledger', name: 'Ledger' as const, params: { tenancyId } };
  const navigation = {} as Props['navigation'];
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ThemeProvider>
        <LedgerScreen navigation={navigation} route={route} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

function allText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAllByType(ThemedText)
    .map(n => (typeof n.props.children === 'string' ? n.props.children : ''))
    .join(' | ');
}

function badgeLabels(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Badge).map(b => b.props.label as string);
}

describe('LedgerScreen', () => {
  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  });

  it('shows a loading state before any snapshot arrives', () => {
    jest.mocked(onSnapshot).mockImplementation(() => () => {});
    const renderer = renderLedger('t1');
    expect(allText(renderer)).toContain('Loading ledger');
  });

  it('shows an empty state when the tenancy has no rent periods yet', () => {
    installFakeFirestore({ tenancies: [fakeTenancy()], rentPeriods: [], rentPayments: [] });
    const renderer = renderLedger('t1');
    expect(allText(renderer)).toContain('No rent periods yet');
  });

  it('badges a fully pending period', () => {
    installFakeFirestore({ tenancies: [fakeTenancy()], rentPeriods: [fakeRentPeriod()], rentPayments: [] });
    const renderer = renderLedger('t1');
    expect(badgeLabels(renderer)).toContain('Pending');
  });

  it('badges a fully paid period', () => {
    installFakeFirestore({
      tenancies: [fakeTenancy()],
      rentPeriods: [fakeRentPeriod()],
      rentPayments: [fakePayment()],
    });
    const renderer = renderLedger('t1');
    expect(badgeLabels(renderer)).toContain('Paid');
  });

  it('badges a partially paid period and shows the pending remainder', () => {
    installFakeFirestore({
      tenancies: [fakeTenancy()],
      rentPeriods: [fakeRentPeriod()],
      rentPayments: [
        fakePayment({ amountPaise: 1_000_000, allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 1_000_000 }] }),
      ],
    });
    const renderer = renderLedger('t1');
    expect(badgeLabels(renderer)).toContain('Partial');
    expect(allText(renderer)).toContain('₹8,000');
  });

  it('shows a credit banner for an overpaid tenancy', () => {
    installFakeFirestore({
      tenancies: [fakeTenancy()],
      rentPeriods: [fakeRentPeriod()],
      rentPayments: [
        fakePayment({ amountPaise: 2_000_000, allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 1_800_000 }] }),
      ],
    });
    const renderer = renderLedger('t1');
    expect(allText(renderer)).toContain('Credit (unapplied)');
  });

  it('summarizes a period paid partly cash and partly UPI', () => {
    installFakeFirestore({
      tenancies: [fakeTenancy()],
      rentPeriods: [fakeRentPeriod()],
      rentPayments: [
        fakePayment({
          id: 'p-cash',
          method: 'cash',
          amountPaise: 1_000_000,
          allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 1_000_000 }],
        }),
        fakePayment({
          id: 'p-upi',
          method: 'upi',
          amountPaise: 800_000,
          allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 800_000 }],
        }),
      ],
    });
    const renderer = renderLedger('t1');
    expect(allText(renderer)).toContain('Cash + UPI');
  });

  it('exports history as CSV through the share sheet', () => {
    installFakeFirestore({ tenancies: [fakeTenancy()], rentPeriods: [fakeRentPeriod()], rentPayments: [] });
    const renderer = renderLedger('t1');
    const exportButton = renderer.root.findAllByProps({ title: 'Export history' })[0];
    expect(exportButton).toBeDefined();
    act(() => {
      (exportButton?.props as { onPress: () => void }).onPress();
    });
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Rent history') }),
    );
  });

  it('shares a per-period statement that lists each payment individually', () => {
    installFakeFirestore({
      tenancies: [fakeTenancy()],
      rentPeriods: [fakeRentPeriod()],
      rentPayments: [fakePayment()],
    });
    const renderer = renderLedger('t1');
    // findAllByType(Pressable) comes up empty under this RN/test-renderer
    // combo (Pressable doesn't survive as a type-matchable node) — match by
    // props instead, which traverses composite instances reliably.
    const pressable = renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(ThemedText).some(t => t.props.children === 'Share'),
    );
    expect(pressable).toBeDefined();
    act(() => {
      (pressable.props as { onPress: () => void }).onPress();
    });
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('via UPI') }),
    );
  });
});
