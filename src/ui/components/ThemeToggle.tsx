import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme, useThemeOverride } from '../ThemeProvider';
import type { ThemeOverride } from '../theme';
import { ThemedText } from './ThemedText';

const OPTIONS: ReadonlyArray<{ value: ThemeOverride; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const theme = useTheme();
  const { override, setOverride } = useThemeOverride();

  return (
    <View style={[styles.row, { borderColor: theme.colors.border }]}>
      {OPTIONS.map(opt => {
        const active = opt.value === override;
        const segmentStyle = [styles.segment, { backgroundColor: active ? theme.colors.primary : 'transparent' }];
        const labelStyle = { color: active ? theme.colors.onPrimary : theme.colors.textMuted };
        return (
          <Pressable key={opt.value} onPress={() => setOverride(opt.value)} style={segmentStyle}>
            <ThemedText variant="label" style={labelStyle}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, overflow: 'hidden' },
  segment: { paddingVertical: 6, paddingHorizontal: 10 },
});
