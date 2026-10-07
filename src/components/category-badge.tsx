import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { EventCategory } from '@/types/event';
import { BADGE_INK, CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { formatCategory } from '@/utils/format';

type CategoryBadgeProps = {
  category: EventCategory;
};

/** Compact category chip — same language as map peek and event detail. */
export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <ThemedView style={[styles.badge, { backgroundColor: CATEGORY_BADGE_COLORS[category] }]}>
      <ThemedText type="metaBold" style={styles.text}>
        {formatCategory(category).toUpperCase()}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  text: {
    color: BADGE_INK,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
});
