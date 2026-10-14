import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { onSnapshot } from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/types';
import { ThemeProvider } from '@ui/ThemeProvider';
import { ThemedText } from '@ui/components/ThemedText';
import { installFakeFirestore } from '../../testUtils/fakeFirestore';
import { fakeTenancy } from '../../testUtils/fixtures';
import { TenantHomeScreen } from '../TenantHomeScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'TenantHome'>;

function renderTenantHome() {
  const navigation = { navigate: jest.fn(), replace: jest.fn() } as unknown as Props['navigation'];
  const route = { key: 'TenantHome', name: 'TenantHome' as const, params: undefined };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ThemeProvider>
        <TenantHomeScreen
          navigation={navigation}
          route={route}
          uid="tenant1"
          canSwitchToOwner={false}
          onSwitchRole={() => {}}
        />
      </ThemeProvider>,
    );
  });
  return { renderer, navigation };
}

function allText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAllByType(ThemedText)
    .map(n => (typeof n.props.children === 'string' ? n.props.children : ''))
    .join(' | ');
}

describe('TenantHomeScreen', () => {
  it('shows a loading state before any snapshot arrives', () => {
    jest.mocked(onSnapshot).mockImplementation(() => () => {});
    const { renderer } = renderTenantHome();
    expect(allText(renderer)).toContain('Loading your tenancies');
  });

  it('shows docs/tenant-claim.md’s exact empty-state copy when there is no tenancy at all', () => {
    installFakeFirestore({ tenancies: [] });
    const { renderer } = renderTenantHome();
    expect(allText(renderer)).toContain('No rental linked yet');
    expect(allText(renderer)).toContain('Ask your owner to invite you from UnitHub.');
  });

  it('auto-navigates straight to the ledger when there is exactly one tenancy', () => {
    installFakeFirestore({ tenancies: [fakeTenancy({ id: 't1' })] });
    const { navigation } = renderTenantHome();
    expect(navigation.replace).toHaveBeenCalledWith('Ledger', { tenancyId: 't1' });
  });

  it('shows a unit switcher when the same phone claimed two tenancies', () => {
    installFakeFirestore({
      tenancies: [
        fakeTenancy({ id: 't1', tenantName: 'Rahul (Flat 2B)' }),
        fakeTenancy({ id: 't2', tenantName: 'Rahul (Flat 3A)' }),
      ],
    });
    const { renderer, navigation } = renderTenantHome();
    const text = allText(renderer);
    expect(text).toContain('Rahul (Flat 2B)');
    expect(text).toContain('Rahul (Flat 3A)');
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
