import { StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { useAuthBootstrap } from '@lib/useAuthBootstrap';
import { useAuthUser } from '@lib/useAuthUser';
import { useTheme } from '@ui/ThemeProvider';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import { CenteredMessage } from './CenteredMessage';

/** Reuses React Navigation's own font metrics (platform-correct) and swaps
 *  in our color tokens, so native-stack header chrome matches dark mode
 *  too, not just screen content. */
function toNavigationTheme(theme: ReturnType<typeof useTheme>): NavTheme {
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.mode === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };
}

export function RootNavigator() {
  const theme = useTheme();
  const { user, initializing } = useAuthUser();
  const bootstrap = useAuthBootstrap(user);

  let content;
  if (initializing) {
    content = <CenteredMessage text="Loading…" />;
  } else if (!user) {
    content = <AuthNavigator />;
  } else if (bootstrap.phase === 'error') {
    content = <CenteredMessage text={bootstrap.message} />;
  } else if (bootstrap.phase !== 'ready') {
    content = <CenteredMessage text="Setting up your account…" />;
  } else {
    content = <AppNavigator user={user} />;
  }

  return (
    <NavigationContainer theme={toNavigationTheme(theme)}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      {content}
    </NavigationContainer>
  );
}
