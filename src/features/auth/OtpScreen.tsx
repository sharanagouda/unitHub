import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { useTheme } from '@ui/ThemeProvider';
import { Screen } from '@ui/components/Screen';
import { ThemedButton } from '@ui/components/ThemedButton';
import { ThemedText } from '@ui/components/ThemedText';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route }: Props) {
  const theme = useTheme();
  const { phoneNumber, confirmation } = route.params;
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await confirmation.confirm(code);
      // No navigation call here: a successful confirm() updates Firebase
      // Auth's current user, useAuthUser's onAuthStateChanged listener picks
      // it up, and RootNavigator swaps to AppNavigator on its own.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work. Try again.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Screen>
      <View style={styles.centerVertically}>
        <ThemedText variant="body" style={{ marginBottom: theme.spacing.lg }}>
          Enter the code sent to {phoneNumber}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, marginBottom: theme.spacing.lg }]}
          value={code}
          onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
        />
        {error ? (
          <ThemedText variant="error" style={{ marginBottom: theme.spacing.md }}>
            {error}
          </ThemedText>
        ) : null}
        <ThemedButton
          title={confirming ? 'Verifying…' : 'Verify'}
          onPress={handleConfirm}
          disabled={code.length !== 6 || confirming}
        />
        {confirming ? <ActivityIndicator style={{ marginTop: theme.spacing.lg }} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerVertically: { flex: 1, justifyContent: 'center' },
  input: { fontSize: 24, letterSpacing: 8, textAlign: 'center', borderBottomWidth: 1, paddingVertical: 8 },
});
