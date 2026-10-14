import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signInWithPhoneNumber } from '@react-native-firebase/auth';
import { authInstance } from '@lib/auth';
import type { AuthStackParamList } from '@navigation/types';
import { useTheme } from '@ui/ThemeProvider';
import { Screen } from '@ui/components/Screen';
import { ThemedButton } from '@ui/components/ThemedButton';
import { ThemedText } from '@ui/components/ThemedText';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

const COUNTRY_CODE = '+91';

export function PhoneEntryScreen({ navigation }: Props) {
  const theme = useTheme();
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneNumber = `${COUNTRY_CODE}${digits}`;
  const canSubmit = digits.length === 10 && !sending;

  async function handleSendCode() {
    setSending(true);
    setError(null);
    try {
      const confirmation = await signInWithPhoneNumber(authInstance(), phoneNumber);
      navigation.navigate('Otp', { phoneNumber, confirmation });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.centerVertically}>
        <ThemedText variant="label" style={{ marginBottom: theme.spacing.sm }}>
          Phone number
        </ThemedText>
        <View
          style={[
            styles.inputRow,
            { borderColor: theme.colors.border, marginBottom: theme.spacing.lg },
          ]}
        >
          <ThemedText variant="body" style={{ marginRight: theme.spacing.sm }}>
            {COUNTRY_CODE}
          </ThemedText>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={digits}
            onChangeText={text => setDigits(text.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="98765 43210"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
          />
        </View>
        {error ? (
          <ThemedText variant="error" style={{ marginBottom: theme.spacing.md }}>
            {error}
          </ThemedText>
        ) : null}
        <ThemedButton title={sending ? 'Sending…' : 'Send code'} onPress={handleSendCode} disabled={!canSubmit} />
        {sending ? <ActivityIndicator style={{ marginTop: theme.spacing.lg }} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerVertically: { flex: 1, justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  input: { flex: 1, fontSize: 18, paddingVertical: 8 },
});
