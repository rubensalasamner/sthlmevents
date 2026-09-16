import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter, type CategoryFilterValue } from '@/components/category-filter';
import { DateFilter } from '@/components/date-filter';
import { EventList } from '@/components/event-list';
import { FeaturedStrip } from '@/components/featured-strip';
import { InterestsEntry } from '@/components/interests-entry';
import { NearMeFilter, type NearRadiusKm } from '@/components/near-me-filter';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { SourceFilter, type SourceFilterValue } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useInterests } from '@/context/interests-context';
import { useEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import type { StockholmEvent } from '@/types/event';
import { collapseSeries } from '@/utils/collapse-series';
import {
  dateRangeHeading,
  dateRangeSubtitle,
  splitByDateRange,
  type DateRangeValue,
} from '@/utils/date-range';
import { filterByDistance, sortByDistance } from '@/utils/geo';
import { featuredEvents, orderFeed } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

export default function EventsScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const {
    category,
    query,
    dateRange,
    source,
    nearMe,
    nearRadiusKm,
    contextualDateDefault,
    setCategory,
    setQuery,
    setDateRange,
    setSource,
    setNearMe,
    setNearRadiusKm,
  } = useFilters();
  const now = useMemo(() => new Date(), []);
  const { location, loading: locating, error: locationError } = useUserLocation(nearMe);
  const { categories: interestCategories } = useInterests();
  const theme = useTheme();
  const deferredInterests = useDeferredValue(interestCategories);

  // Keep pill selection instant; defer the heavy list pipeline so date / near-me
  // taps don't freeze the JS thread on ~5k events.
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);
  const deferredSource = useDeferredValue(source);
  const deferredDateRange = useDeferredValue(dateRange);
  const deferredNearMe = useDeferredValue(nearMe);
  const deferredNearRadiusKm = useDeferredValue(nearRadiusKm);
  const deferredLocation = useDeferredValue(location);

  const listPending =
    deferredQuery !== query ||
    deferredCategory !== category ||
    deferredSource !== source ||
    deferredDateRange !== dateRange ||
    deferredNearMe !== nearMe ||
    deferredNearRadiusKm !== nearRadiusKm ||
    deferredLocation !== location;

  const isDefaultView =
    !filtersActive(
      deferredCategory,
      deferredDateRange,
      deferredSource,
      deferredNearMe,
      contextualDateDefault,
    ) && deferredQuery.trim() === '';

  const baseFiltered = useMemo(() => {
    let result = searchEvents(events, deferredQuery);
    if (deferredCategory !== 'all') {
      result = result.filter((event) => event.category === deferredCategory);
    }
    if (deferredSource !== 'all') {
      result = result.filter((event) => event.source === deferredSource);
    }
    return result;
  }, [events, deferredQuery, deferredCategory, deferredSource]);

  const featured = useMemo(() => {
    if (!isDefaultView) return [];
    const { primary, secondary } = splitByDateRange(baseFiltered, deferredDateRange);
    return featuredEvents([...primary, ...secondary]);
  }, [baseFiltered, isDefaultView, deferredDateRange]);

  const feedEvents = useMemo(() => {
    const { primary, secondary } = splitByDateRange(baseFiltered, deferredDateRange);
    const merged = [...primary, ...secondary];
    const withoutFeatured = isDefaultView
      ? merged.filter((event) => !event.isFeatured)
      : merged;
    const { events: collapsed } = collapseSeries(withoutFeatured);
    return orderFeed(collapsed, now, { preferredCategories: deferredInterests });
  }, [baseFiltered, deferredDateRange, isDefaultView, now, deferredInterests]);

  const listEvents = useMemo(() => {
    if (!deferredNearMe || !deferredLocation) return feedEvents;
    return sortByDistance(
      filterByDistance(feedEvents, deferredLocation, deferredNearRadiusKm),
      deferredLocation,
    );
  }, [feedEvents, deferredNearMe, deferredLocation, deferredNearRadiusKm]);

  const nearStatus =
    nearMe && locating
      ? 'Locating…'
      : nearMe && locationError === 'denied'
        ? 'Location denied'
        : nearMe && locationError
          ? 'Location unavailable'
          : null;

  const listHeader = useMemo(
    () => (
      <DiscoverHeader
        events={events}
        listCount={listEvents.length}
        listPending={listPending}
        pendingColor={theme.textSecondary}
        category={category}
        onCategoryChange={setCategory}
        query={query}
        onQueryChange={setQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        source={source}
        onSourceChange={setSource}
        nearMe={nearMe}
        onNearMeChange={setNearMe}
        nearRadiusKm={nearRadiusKm}
        onNearRadiusChange={setNearRadiusKm}
        nearStatus={nearStatus}
        featured={featured}
      />
    ),
    [
      events,
      listEvents.length,
      listPending,
      theme.textSecondary,
      category,
      setCategory,
      query,
      setQuery,
      dateRange,
      setDateRange,
      source,
      setSource,
      nearMe,
      setNearMe,
      nearRadiusKm,
      setNearRadiusKm,
      nearStatus,
      featured,
    ],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <EventList
          events={listEvents}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage="No events match your filters."
          ListHeaderComponent={listHeader}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function filtersActive(
  category: CategoryFilterValue,
  dateRange: DateRangeValue,
  source: SourceFilterValue,
  nearMe: boolean,
  contextualDateDefault: DateRangeValue,
): boolean {
  return (
    category !== 'all' ||
    dateRange !== contextualDateDefault ||
    source !== 'all' ||
    nearMe
  );
}

type DiscoverHeaderProps = {
  events: StockholmEvent[];
  listCount: number;
  listPending: boolean;
  pendingColor: string;
  category: CategoryFilterValue;
  onCategoryChange: (value: CategoryFilterValue) => void;
  query: string;
  onQueryChange: (value: string) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  source: SourceFilterValue;
  onSourceChange: (value: SourceFilterValue) => void;
  nearMe: boolean;
  onNearMeChange: (value: boolean) => void;
  nearRadiusKm: NearRadiusKm;
  onNearRadiusChange: (value: NearRadiusKm) => void;
  nearStatus: string | null;
  featured: StockholmEvent[];
};

function DiscoverHeader({
  events,
  listCount,
  listPending,
  pendingColor,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  dateRange,
  onDateRangeChange,
  source,
  onSourceChange,
  nearMe,
  onNearMeChange,
  nearRadiusKm,
  onNearRadiusChange,
  nearStatus,
  featured,
}: DiscoverHeaderProps) {
  const heading = dateRangeHeading(dateRange);
  const [devSourcesUnlocked, setDevSourcesUnlocked] = useState(false);
  const titleTapsRef = useRef({ count: 0, at: 0 });

  const onTitlePress = () => {
    if (!__DEV__) return;
    const now = Date.now();
    if (now - titleTapsRef.current.at > 1500) titleTapsRef.current.count = 0;
    titleTapsRef.current.at = now;
    titleTapsRef.current.count += 1;
    if (titleTapsRef.current.count < 5) return;
    titleTapsRef.current.count = 0;
    setDevSourcesUnlocked((open) => {
      if (open) onSourceChange('all');
      return !open;
    });
  };

  return (
    <View style={styles.header}>
      <ScreenHeader
        title="Stockholm Events"
        subtitle={dateRangeSubtitle(dateRange)}
        onTitlePress={onTitlePress}
      />
      <SearchBar value={query} onChange={onQueryChange} />
      <DateFilter value={dateRange} onChange={onDateRangeChange} />
      <CategoryFilter value={category} onChange={onCategoryChange} />
      <NearMeFilter
        enabled={nearMe}
        onEnabledChange={onNearMeChange}
        radiusKm={nearRadiusKm}
        onRadiusChange={onNearRadiusChange}
        statusLabel={nearStatus}
      />
      <SourceFilter
        events={events}
        value={source}
        onChange={onSourceChange}
        unlocked={devSourcesUnlocked}
      />
      <FeaturedStrip
        events={featured}
        heading={heading === 'This weekend' ? 'This weekend' : undefined}
      />
      <View style={styles.sectionRow}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {nearMe ? 'Near you' : heading}{' '}
          <ThemedText type="small" themeColor="textSecondary">
            {listCount}
          </ThemedText>
        </ThemedText>
        {listPending ? <ActivityIndicator size="small" color={pendingColor} /> : null}
        <View style={styles.sectionSpacer} />
        <InterestsEntry />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  sectionSpacer: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
  },
});
