import { StyleSheet, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { ThemedText } from './ThemedText';

interface Props {
  title: string;
  message?: string;
}

export function EmptyState({ title, message }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      <ThemedText variant="subtitle" style={styles.center}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText variant="muted" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center', marginTop: 4 },
});
