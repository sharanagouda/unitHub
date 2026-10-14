import { darkColors, lightColors, type ColorTokens } from './tokens/colors';
import { spacing } from './tokens/spacing';
import { fontSize, fontWeight } from './tokens/typography';

export type ThemeMode = 'light' | 'dark';
/** What's persisted: an explicit choice, or "follow the system". */
export type ThemeOverride = ThemeMode | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
}

/** Pure — the resolution of override+system scheme into a mode happens in
 *  ThemeProvider; this just builds the token set for a known mode. */
export function resolveTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    fontSize,
    fontWeight,
  };
}
