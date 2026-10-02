import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useTheme } from '@/hooks/use-theme';
import { activeFilterFacets, filterSummaryLabel } from '@/utils/filter-label';
import { dateRangeHeading } from '@/utils/date-range';

type FilterBarProps = {
  onPress: () => void;
  /**
   * Home already titles the date window — hide it here so the row isn’t
   * “This weekend” twice. Map/agenda keep the date on the leading chip.
   */
  hideDate?: boolean;
};

/**
 * One leading chip that opens the sheet, plus removable chips for active
 * non-date facets. Uses the empty chip-row space without dumping every category.
 */
export function FilterBar({ onPress, hideDate = false }: FilterBarProps) {
  const theme = useTheme();
  const {
    dateRange,
    category,
    nearMe,
    nearRadiusKm,
    query,
    isActive,
    setCategory,
    setNearMe,
    setNearRadiusKm,
    setQuery,
  } = useFilters();

  const facets = activeFilterFacets({ category, nearMe, nearRadiusKm, query });
  const leading = hideDate ? 'Filters' : dateRangeHeading(dateRange);
  const a11y = filterSummaryLabel({ dateRange, category, nearMe, nearRadiusKm, query });

  const clearFacet = (id: (typeof facets)[number]['id']) => {
    if (id === 'category') setCategory('all');
    else if (id === 'near') {
      setNearMe(false);
      setNearRadiusKm(null);
    } else setQuery('');
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filters, ${a11y}`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type={isActive || facets.length > 0 ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.chip}>
          <Icon sf="slider.horizontal.3" material="tune" size={16} color={theme.text} />
          <ThemedText type="metaBold" numberOfLines={1}>
            {leading}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {facets.map((facet) => (
        <Pressable
          key={facet.id}
          accessibilityRole="button"
          accessibilityLabel={`${facet.label}, remove filter`}
          onPress={() => clearFacet(facet.id)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="accent" style={styles.facet}>
            <ThemedText type="metaBold" themeColor="accentInk" numberOfLines={1}>
              {facet.label}
            </ThemedText>
            <Icon sf="xmark" material="close" size={14} color={theme.accentInk} />
          </ThemedView>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  facet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxWidth: 180,
  },
  pressed: {
    opacity: 0.75,
  },
});
