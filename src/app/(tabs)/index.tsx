import { useMemo, useState } from 'react';
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
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useEvents } from '@/hooks/use-events';
import type { StockholmEvent } from '@/types/event';
import { collapseSeries } from '@/utils/collapse-series';
import { splitByDateRange, type DateRangeValue } from '@/utils/date-range';
import { isLongRunning } from '@/utils/event-interval';
import { featuredEvents, rankEvents } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

export default function EventsScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { category, query, dateRange, source, setCategory, setQuery, setDateRange, setSource, isActive: filtersActive } =
    useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const isDefaultView = !filtersActive && query.trim() === '';

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
    const { primary, secondary } = splitByDateRange(result, dateRange);
    // In default view the featured carousel owns the promoted events.
    const dropFeatured = (list: StockholmEvent[]) =>
      isDefaultView ? list.filter((event) => !event.isFeatured) : list;
    // Collapse recurring occurrences (same title + venue) per group, then
    // rank each group. Long-running fixtures (months-long exhibitions) sink
    // to the very end so the day's own events lead the flow.
    const { events: collapsedPrimary } = collapseSeries(primary);
    const { events: collapsedSecondary } = collapseSeries(secondary);
    const longRunning = collapsedSecondary.filter((event) => isLongRunning(event, now));
    const rest = collapsedSecondary.filter((event) => !isLongRunning(event, now));
    return [
      ...rankEvents(dropFeatured(collapsedPrimary)),
      ...rankEvents(dropFeatured(rest)),
      ...longRunning.filter((event) => !event.isFeatured),
    ];
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
              filtersOpen={filtersOpen}
              onToggleFilters={() => setFiltersOpen((open) => !open)}
              filtersActive={filtersActive}
              featured={featured}
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
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
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersActive: boolean;
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
  filtersOpen,
  onToggleFilters,
  filtersActive,
  featured,
}: DiscoverHeaderProps) {
  const showFilterRows = filtersOpen || filtersActive;

  return (
    <View style={styles.header}>
      <ScreenHeader title="Stockholm Events" subtitle="What’s on in the city" />
      <SearchBar
        value={query}
        onChange={onQueryChange}
        filtersOpen={filtersOpen}
        onToggleFilters={onToggleFilters}
      />
      {showFilterRows && (
        <View style={styles.filterRows}>
          <CategoryFilter value={category} onChange={onCategoryChange} />
          <DateFilter value={dateRange} onChange={onDateRangeChange} />
          <SourceFilter events={events} value={source} onChange={onSourceChange} />
        </View>
      )}
      <FeaturedStrip events={featured} />
      <View style={styles.sectionRow}>
        <ThemedText type="subtitle">
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
  filterRows: {
    gap: 0,
  },
  sectionRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
});
