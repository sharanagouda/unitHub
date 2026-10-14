import { resolveTheme } from '../theme';
import { darkColors, lightColors } from '../tokens/colors';

describe('resolveTheme', () => {
  it('resolves light mode to the light palette', () => {
    const theme = resolveTheme('light');
    expect(theme.mode).toBe('light');
    expect(theme.colors).toEqual(lightColors);
  });

  it('resolves dark mode to the dark palette', () => {
    const theme = resolveTheme('dark');
    expect(theme.mode).toBe('dark');
    expect(theme.colors).toEqual(darkColors);
  });

  it('light and dark palettes define exactly the same token keys', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });

  it('light and dark use genuinely different colors for every token', () => {
    // Catches a copy-paste palette (e.g. dark accidentally reusing light's
    // values) — a "dark theme" that's secretly identical to light is a bug,
    // not a design choice.
    for (const key of Object.keys(lightColors) as (keyof typeof lightColors)[]) {
      expect(darkColors[key]).not.toBe(lightColors[key]);
    }
  });
});
