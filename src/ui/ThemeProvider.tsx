import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';
import { resolveTheme, type Theme, type ThemeMode, type ThemeOverride } from './theme';

const THEME_OVERRIDE_KEY = 'unithub.themeOverride';

interface ThemeContextValue {
  theme: Theme;
  override: ThemeOverride;
  setOverride: (override: ThemeOverride) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeOverride(value: string | undefined): value is ThemeOverride {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Resolution order: an explicit, persisted override beats the system
 * setting; "system" (the default — nothing stored yet) follows
 * useColorScheme(); light is the fallback if even that is unavailable.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [stored, setStored] = useMMKVString(THEME_OVERRIDE_KEY);
  const override: ThemeOverride = isThemeOverride(stored) ? stored : 'system';
  const mode: ThemeMode = override === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : override;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolveTheme(mode),
      override,
      setOverride: next => setStored(next),
    }),
    [mode, override, setStored],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme/useThemeOverride must be used within a <ThemeProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeOverride(): Pick<ThemeContextValue, 'override' | 'setOverride'> {
  const { override, setOverride } = useThemeContext();
  return { override, setOverride };
}
