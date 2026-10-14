import { StyleSheet, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import type { Theme } from '../theme';
import { ThemedText } from './ThemedText';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'credit' | 'neutral';

interface Props {
  label: string;
  tone?: BadgeTone;
}

function toneColors(theme: Theme, tone: BadgeTone): { bg: string; fg: string } {
  switch (tone) {
    case 'success':
      return { bg: theme.colors.success, fg: theme.colors.onSuccess };
    case 'warning':
      return { bg: theme.colors.warning, fg: theme.colors.onWarning };
    case 'danger':
      return { bg: theme.colors.danger, fg: theme.colors.onDanger };
    case 'credit':
      return { bg: theme.colors.credit, fg: theme.colors.onCredit };
    case 'neutral':
      return { bg: theme.colors.border, fg: theme.colors.text };
  }
}

export function Badge({ label, tone = 'neutral' }: Props) {
  const theme = useTheme();
  const { bg, fg } = toneColors(theme, tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText variant="label" style={{ color: fg }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
});
