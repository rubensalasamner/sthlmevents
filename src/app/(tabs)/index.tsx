import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter, type CategoryFilterValue } from '@/components/category-filter';
import { DateFilter } from '@/components/date-filter';
import { EventList } from '@/components/event-list';
import { FeaturedStrip } from '@/components/featured-strip';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { SourceFilter, type SourceFilterValue } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useEvents } from '@/hooks/use-events';
import type { StockholmEvent } from '@/types/event';
import { collapseSeries } from '@/utils/collapse-series';
import { splitByDateRange, type DateRangeValue } from '@/utils/date-range';
import { featuredEvents, orderFeed } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

export default function EventsScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { category, query, dateRange, source, setCategory, setQuery, setDateRange, setSource } =
    useFilters();
  const now = useMemo(() => new Date(), []);

  const isDefaultView = !filtersActive(category, dateRange, source) && query.trim() === '';

  const featured = useMemo(
    () => (isDefaultView ? featuredEvents(events) : []),
    [events, isDefaultView],
  );

  const listEvents = useMemo(() => {
    let result = searchEvents(events, query);
    if (category !== 'all') {
      result = result.filter((event) => event.category === category);
    }
    if (source !== 'all') {
      result = result.filter((event) => event.source === source);
    }
    // The window decides membership only; ordering is uniform for every
    // range: not-yet-started by date, then running-now by soonest END
    // (dying-tonight above months-long), per the feed spec.
    const { primary, secondary } = splitByDateRange(result, dateRange);
    // In default view the featured carousel owns the promoted events.
    const dropFeatured = (list: StockholmEvent[]) =>
      isDefaultView ? list.filter((event) => !event.isFeatured) : list;
    const { events: collapsed } = collapseSeries([...primary, ...secondary]);
    return orderFeed(dropFeatured(collapsed), now);
    // `now` is intentionally not a dependency: a feed rebuild per second is
    // pointless, and staleness only shifts section membership by moments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, query, category, source, dateRange, isDefaultView]);

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
              events={events}
              listCount={listEvents.length}
              category={category}
              onCategoryChange={setCategory}
              query={query}
              onQueryChange={setQuery}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              source={source}
              onSourceChange={setSource}
              featured={featured}
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

/** True when any filter deviates from its default. */
function filtersActive(
  category: CategoryFilterValue,
  dateRange: DateRangeValue,
  source: SourceFilterValue,
): boolean {
  return category !== 'all' || dateRange !== 'all' || source !== 'all';
}

type DiscoverHeaderProps = {
  events: StockholmEvent[];
  listCount: number;
  category: CategoryFilterValue;
  onCategoryChange: (value: CategoryFilterValue) => void;
  query: string;
  onQueryChange: (value: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  source: SourceFilterValue;
  onSourceChange: (value: SourceFilterValue) => void;
  featured: StockholmEvent[];
};

function DiscoverHeader({
  events,
  listCount,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  dateRange,
  onDateRangeChange,
  source,
  onSourceChange,
  featured,
}: DiscoverHeaderProps) {
  return (
    <View style={styles.header}>
      <ScreenHeader title="Stockholm Events" subtitle="What’s on in the city" />
      <SearchBar value={query} onChange={onQueryChange} />
      <DateFilter value={dateRange} onChange={onDateRangeChange} />
      <CategoryFilter value={category} onChange={onCategoryChange} />
      <SourceFilter events={events} value={source} onChange={onSourceChange} />
      <FeaturedStrip events={featured} />
      <View style={styles.sectionRow}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          All events{' '}
          <ThemedText type="small" themeColor="textSecondary">
            {listCount}
          </ThemedText>
        </ThemedText>
      </View>
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
  sectionRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
  },
});
