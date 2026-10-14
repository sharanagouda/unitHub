import { StyleSheet, View } from 'react-native';
import { useTheme } from '@ui/ThemeProvider';
import { Screen } from '@ui/components/Screen';
import { ThemedText } from '@ui/components/ThemedText';

export function CenteredMessage({ text }: { text: string }) {
  const theme = useTheme();
  const textStyle = { textAlign: 'center' as const, color: theme.colors.textMuted };
  return (
    <Screen>
      <View style={styles.center}>
        <ThemedText variant="body" style={textStyle}>
          {text}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
