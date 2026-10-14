import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { ThemedText } from './ThemedText';

interface Props {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}

export function ListRow({ title, subtitle, trailing, onPress }: Props) {
  const theme = useTheme();

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border, paddingVertical: theme.spacing.md }]}>
      <View style={styles.main}>
        <ThemedText variant="body" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="muted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flex: 1 },
  trailing: { marginLeft: 12, alignItems: 'flex-end' },
});
