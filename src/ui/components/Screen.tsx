import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

/** A themed full-bleed container. Screens that need scrolling bring their
 *  own ScrollView inside this — kept deliberately dumb. */
export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: theme.spacing.lg }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
