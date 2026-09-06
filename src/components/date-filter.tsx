import { ScrollView, StyleSheet } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { Spacing } from '@/constants/theme';
import { DATE_RANGES, DATE_RANGE_LABELS, type DateRangeValue } from '@/utils/date-range';

type DateFilterProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {DATE_RANGES.map((range) => (
        <CategoryPill
          key={range}
          label={DATE_RANGE_LABELS[range]}
          selected={value === range}
          onPress={() => onChange(range)}
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
