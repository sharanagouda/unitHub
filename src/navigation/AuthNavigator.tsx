import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OtpScreen } from '@features/auth/OtpScreen';
import { PhoneEntryScreen } from '@features/auth/PhoneEntryScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ title: 'Sign in' }} />
      <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify code' }} />
    </Stack.Navigator>
  );
}
