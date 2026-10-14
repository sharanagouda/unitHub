import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { ThemedText } from './ThemedText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function ThemedButton({ title, onPress, variant = 'primary', disabled = false }: Props) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'danger' ? theme.colors.danger : variant === 'secondary' ? theme.colors.surface : theme.colors.primary;
  const textColor =
    variant === 'danger'
      ? theme.colors.onDanger
      : variant === 'secondary'
        ? theme.colors.text
        : theme.colors.onPrimary;
  const labelStyle = { color: textColor, fontWeight: theme.fontWeight.semibold, textAlign: 'center' as const };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor: theme.colors.border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
    >
      <ThemedText variant="body" style={labelStyle}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
