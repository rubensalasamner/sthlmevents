import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { filterSummaryLabel } from '@/utils/filter-label';

type FilterSummaryChipProps = {
  onPress: () => void;
};

/** One chip that stands in for the old four-row filter stack. */
export function FilterSummaryChip({ onPress }: FilterSummaryChipProps) {
  const { dateRange, category, nearMe, nearRadiusKm, query, isActive } = useFilters();
  const label = filterSummaryLabel({ dateRange, category, nearMe, nearRadiusKm, query });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filters, ${label}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={isActive ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxWidth: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
});
