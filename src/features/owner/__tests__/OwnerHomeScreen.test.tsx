import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { signOut } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/types';
import { ThemeProvider } from '@ui/ThemeProvider';
import { ThemedText } from '@ui/components/ThemedText';
import { installFakeFirestore } from '../../testUtils/fakeFirestore';
import { fakeTenancy } from '../../testUtils/fixtures';
import { OwnerHomeScreen } from '../OwnerHomeScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'OwnerHome'>;

function renderOwnerHome(opts: { canSwitchToTenant?: boolean; onSwitchRole?: () => void } = {}) {
  const navigation = { navigate: jest.fn() } as unknown as Props['navigation'];
  const route = { key: 'OwnerHome', name: 'OwnerHome' as const, params: undefined };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ThemeProvider>
        <OwnerHomeScreen
          navigation={navigation}
          route={route}
          uid="owner1"
          canSwitchToTenant={opts.canSwitchToTenant ?? false}
          onSwitchRole={opts.onSwitchRole ?? (() => {})}
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

describe('OwnerHomeScreen', () => {
  it('shows a loading state before any snapshot arrives', () => {
    jest.mocked(onSnapshot).mockImplementation(() => () => {});
    const { renderer } = renderOwnerHome();
    expect(allText(renderer)).toContain('Loading your tenancies');
  });

  it('shows an empty state with no tenancies', () => {
    installFakeFirestore({ tenancies: [] });
    const { renderer } = renderOwnerHome();
    expect(allText(renderer)).toContain('No tenancies yet');
  });

  it('lists each of the owner’s tenancies, active and ended alike', () => {
    installFakeFirestore({
      tenancies: [
        fakeTenancy({ id: 't1', tenantName: 'Rahul', status: 'active' }),
        fakeTenancy({ id: 't2', tenantName: 'Priya', status: 'ended' }),
      ],
    });
    const { renderer } = renderOwnerHome();
    const text = allText(renderer);
    expect(text).toContain('Rahul');
    expect(text).toContain('Priya');
  });

  it('navigates to that tenancy’s ledger when a row is tapped', () => {
    installFakeFirestore({ tenancies: [fakeTenancy({ id: 't1', tenantName: 'Rahul' })] });
    const { renderer, navigation } = renderOwnerHome();
    const row = renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(ThemedText).some(t => t.props.children === 'Rahul'),
    );
    act(() => {
      (row.props as { onPress: () => void }).onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Ledger', { tenancyId: 't1' });
  });

  it('only shows "switch to tenant view" when the owner also has a tenant role', () => {
    installFakeFirestore({ tenancies: [] });
    const { renderer: withoutSwitch } = renderOwnerHome({ canSwitchToTenant: false });
    expect(allText(withoutSwitch)).not.toContain('Switch to tenant view');

    const { renderer: withSwitch } = renderOwnerHome({ canSwitchToTenant: true });
    expect(allText(withSwitch)).toContain('Switch to tenant view');
  });

  it('signs out when "Sign out" is pressed', () => {
    installFakeFirestore({ tenancies: [] });
    const { renderer } = renderOwnerHome();
    const signOutButton = renderer.root.findAllByProps({ title: 'Sign out' })[0];
    act(() => {
      (signOutButton?.props as { onPress: () => void }).onPress();
    });
    expect(signOut).toHaveBeenCalled();
  });
});
