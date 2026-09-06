import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ScreenHeader({ title, subtitle, children }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
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
});
