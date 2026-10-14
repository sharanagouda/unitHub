/**
 * @format
 */

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectEmulatorsInDev } from '@lib/firebaseEmulators';
import { useDeepLinkInvite } from '@lib/useDeepLinkInvite';
import { RootNavigator } from '@navigation/RootNavigator';
import { ThemeProvider } from '@ui/ThemeProvider';

// Module scope, not inside a component: must run before any Firebase call a
// hook below might make — there's no ordering guarantee between effects.
connectEmulatorsInDev();

function App() {
  useDeepLinkInvite();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
