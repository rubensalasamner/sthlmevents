import { ScrollView, StyleSheet } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { Spacing } from '@/constants/theme';
import { EVENT_CATEGORIES, type EventCategory } from '@/types/event';
import { formatCategory } from '@/utils/format';

export type CategoryFilterValue = EventCategory | 'all';

type CategoryFilterProps = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      <CategoryPill label="All" selected={value === 'all'} onPress={() => onChange('all')} />
      {EVENT_CATEGORIES.map((category) => (
        <CategoryPill
          key={category}
          label={formatCategory(category)}
          selected={value === category}
          onPress={() => onChange(category)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
