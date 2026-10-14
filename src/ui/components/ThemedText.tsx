import type { ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import type { Theme } from '../theme';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'muted' | 'error' | 'label';

interface Props {
  children: ReactNode;
  variant?: TextVariant;
  style?: TextStyle;
  numberOfLines?: number;
}

function variantStyles(theme: Theme): Record<TextVariant, TextStyle> {
  return {
    title: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
    subtitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: theme.colors.text },
    body: { fontSize: theme.fontSize.md, color: theme.colors.text },
    muted: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
    error: { fontSize: theme.fontSize.sm, color: theme.colors.danger },
    label: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, fontWeight: theme.fontWeight.medium },
  };
}

export function ThemedText({ children, variant = 'body', style, numberOfLines }: Props) {
  const theme = useTheme();
  return (
    <Text style={[variantStyles(theme)[variant], style]} {...(numberOfLines !== undefined ? { numberOfLines } : {})}>
      {children}
    </Text>
  );
}
