import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/**
 * Signals that a collapsed card fronts a recurring event with more upcoming
 * occurrences than the one shown.
 */
export function MoreDatesBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.badge}>
      <ThemedText type="smallBold" style={styles.text}>
        +{count} {count === 1 ? 'more date' : 'more dates'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
  },
});
