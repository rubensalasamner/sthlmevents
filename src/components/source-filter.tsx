import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatSource } from '@/utils/format';

export type SourceFilterValue = string | 'all';

type SourceFilterProps = {
  events: readonly StockholmEvent[];
  value: SourceFilterValue;
  onChange: (value: SourceFilterValue) => void;
};

/**
 * Dev-only companion to `SourceTag`: narrow the list to one ingestion source.
 * Choices are derived from the loaded events, and the whole control renders
 * nothing in production builds.
 */
export function SourceFilter({ events, value, onChange }: SourceFilterProps) {
  const sources = useMemo(() => {
    const distinct = new Set(events.map((event) => event.source));
    return [...distinct].sort((a, b) => formatSource(a).localeCompare(formatSource(b)));
  }, [events]);

  if (!__DEV__) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      <CategoryPill label="All sources" selected={value === 'all'} onPress={() => onChange('all')} />
      {sources.map((source) => (
        <CategoryPill
          key={source}
          label={formatSource(source)}
          selected={value === source}
          onPress={() => onChange(source)}
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
