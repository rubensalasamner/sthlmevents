import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Locked type scale for Blå Timmen:
 * display (screen) → section (rail/sheet) → card (titles) → body → meta.
 */
export type ThemedTextType =
  | 'display'
  | 'section'
  | 'card'
  | 'body'
  | 'meta'
  | 'metaBold'
  | 'link'
  | 'code'
  /** @deprecated Use display */
  | 'title'
  /** @deprecated Use section */
  | 'subtitle'
  /** @deprecated Use body */
  | 'default'
  /** @deprecated Use meta */
  | 'small'
  /** @deprecated Use metaBold */
  | 'smallBold'
  /** @deprecated Use link */
  | 'linkPrimary';

const ALIASES: Record<string, Exclude<ThemedTextType, 'title' | 'subtitle' | 'default' | 'small' | 'smallBold' | 'linkPrimary'>> = {
  title: 'display',
  subtitle: 'section',
  default: 'body',
  small: 'meta',
  smallBold: 'metaBold',
  linkPrimary: 'link',
};

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolved = ALIASES[type] ?? type;
  const colorKey: ThemeColor =
    themeColor ?? (resolved === 'link' ? 'accent' : 'text');

  return (
    <Text
      style={[
        { color: theme[colorKey] },
        resolved === 'display' && styles.display,
        resolved === 'section' && styles.section,
        resolved === 'card' && styles.card,
        resolved === 'body' && styles.body,
        resolved === 'meta' && styles.meta,
        resolved === 'metaBold' && styles.metaBold,
        resolved === 'link' && styles.link,
        resolved === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  card: {
    fontFamily: Fonts.display,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  metaBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
