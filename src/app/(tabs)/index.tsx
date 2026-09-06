import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter, type CategoryFilterValue } from '@/components/category-filter';
import { DateFilter } from '@/components/date-filter';
import { EventList } from '@/components/event-list';
import { FeaturedStrip } from '@/components/featured-strip';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useEvents } from '@/hooks/use-events';
import type { StockholmEvent } from '@/types/event';
import { filterByDateRange, type DateRangeValue } from '@/utils/date-range';
import { featuredEvents, rankEvents } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

export default function EventsScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const [category, setCategory] = useState<CategoryFilterValue>('all');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>('all');

  const isDefaultView = category === 'all' && query.trim() === '' && dateRange === 'all';

  const featured = useMemo(
    () => (isDefaultView ? featuredEvents(events) : []),
    [events, isDefaultView],
  );

  const listEvents = useMemo(() => {
    let result = searchEvents(events, query);
    if (category !== 'all') {
      result = result.filter((event) => event.category === category);
    }
    result = filterByDateRange(result, dateRange);
    if (isDefaultView) {
      result = result.filter((event) => !event.isFeatured);
    }
    return rankEvents(result);
  }, [events, query, category, dateRange, isDefaultView]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <EventList
          events={listEvents}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage="No events match your filters."
          ListHeaderComponent={
            <DiscoverHeader
              category={category}
              onCategoryChange={setCategory}
              query={query}
              onQueryChange={setQuery}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              featured={featured}
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

type DiscoverHeaderProps = {
  category: CategoryFilterValue;
  onCategoryChange: (value: CategoryFilterValue) => void;
  query: string;
  onQueryChange: (value: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  featured: StockholmEvent[];
};

function DiscoverHeader({
  category,
  onCategoryChange,
  query,
  onQueryChange,
  dateRange,
  onDateRangeChange,
  featured,
}: DiscoverHeaderProps) {
  return (
    <View style={styles.header}>
      <ScreenHeader title="Stockholm Events" subtitle="What’s on in the city" />
      <SearchBar value={query} onChange={onQueryChange} />
      <FeaturedStrip events={featured} />
      <CategoryFilter value={category} onChange={onCategoryChange} />
      <DateFilter value={dateRange} onChange={onDateRangeChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    gap: Spacing.two,
    marginHorizontal: -Spacing.four,
    paddingBottom: Spacing.two,
  },
});
