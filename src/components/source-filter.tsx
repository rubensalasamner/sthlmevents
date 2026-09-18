import { useMemo, useState } from 'react';
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
  /** Revealed via the Discover title easter egg — hidden by default even in __DEV__. */
  unlocked?: boolean;
};

/**
 * Dev companion to `SourceTag`: narrow the list to one ingestion source.
 * Only mounts in __DEV__, and only after 5 taps on the Home heading.
 */
export function SourceFilter({ events, value, onChange, unlocked = false }: SourceFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const sources = useMemo(() => {
    const distinct = new Set(events.map((event) => event.source));
    return [...distinct].sort((a, b) => formatSource(a).localeCompare(formatSource(b)));
  }, [events]);

  if (!__DEV__ || !unlocked || sources.length === 0) return null;

  if (!expanded) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <CategoryPill
          label={`DEV · ${sources.length} sources`}
          onPress={() => setExpanded(true)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      <CategoryPill
        label="All sources"
        selected={value === 'all'}
        onPress={() => {
          onChange('all');
          setExpanded(false);
        }}
      />
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
