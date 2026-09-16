import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** Optional — e.g. 5-tap unlock for the DEV source filter. */
  onTitlePress?: () => void;
};

export function ScreenHeader({ title, subtitle, children, onTitlePress }: ScreenHeaderProps) {
  const titleNode = (
    <ThemedText type="title" style={styles.title}>
      {title}
    </ThemedText>
  );

  return (
    <View style={styles.container}>
      {onTitlePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onTitlePress}
          // Keep the hit target title-sized; no visual chrome for the easter egg.
          style={({ pressed }) => pressed && styles.titlePressed}>
          {titleNode}
        </Pressable>
      ) : (
        titleNode
      )}
      {subtitle && (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  titlePressed: {
    opacity: 0.85,
  },
});
