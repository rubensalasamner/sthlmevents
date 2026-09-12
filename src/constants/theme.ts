import '@/global.css';

import { Platform } from 'react-native';

/**
 * "Blå Timmen" — dark-first Nordic dusk with a single ice-blue accent and an
 * amber micro-accent. Light mode is the frost/daytime counterpart with a
 * darkened accent so contrast stays WCAG-AA on light surfaces.
 */
export const Colors = {
  light: {
    text: '#0B0E14',
    background: '#F2F5F9',
    backgroundElement: '#E4EAF2',
    backgroundSelected: '#D3DEEA',
    textSecondary: '#57667A',
    accent: '#0D6FA9',
    accentInk: '#FFFFFF',
    accent2: '#9A5B0B',
    favorite: '#E5345E',
  },
  dark: {
    text: '#F2F5F9',
    background: '#0B0E14',
    backgroundElement: '#151B26',
    backgroundSelected: '#1F2735',
    textSecondary: '#97A3B6',
    accent: '#7CD4FF',
    accentInk: '#06121C',
    accent2: '#FFC46B',
    favorite: '#FF375F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_500Medium',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_500Medium',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_500Medium',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
