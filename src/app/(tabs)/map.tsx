import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/context/favorites-context';
import { useFilters } from '@/context/filters-context';
import { useEvents } from '@/hooks/use-events';
import { useUserLocation } from '@/hooks/use-user-location';
import { collapseSeries } from '@/utils/collapse-series';
import { splitByDateRange } from '@/utils/date-range';
import { filterByDistance, sortByDistance } from '@/utils/geo';
import { searchEvents } from '@/utils/search';

export default function MapScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { category, query, dateRange, source, nearMe, nearRadiusKm, setQuery } = useFilters();
  const { favoriteIds } = useFavorites();
  const { location } = useUserLocation(nearMe);

  const filtered = useMemo(() => {
    let result = searchEvents(events, query);
    if (category !== 'all') {
      result = result.filter((event) => event.category === category);
    }
    if (source !== 'all') {
      result = result.filter((event) => event.source === source);
    }
    const { primary, secondary } = splitByDateRange(result, dateRange);
    let selected = dateRange === 'all' ? result : [...primary, ...secondary];

    if (nearMe && location) {
      selected = filterByDistance(selected, location, nearRadiusKm);
      selected = sortByDistance(selected, location);
    }

    // Favourites keep their accent bubble when they match the active filters;
    // they must not bypass category/date/search (that made the map disagree
    // with Discover after e.g. Pop-up).
    return collapseSeries(selected).events;
  }, [events, category, query, dateRange, source, nearMe, nearRadiusKm, location]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapWrap}>
        <EventMap
          events={filtered}
          favoriteIds={favoriteIds}
          userLocation={nearMe ? location : null}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      </View>
      <SafeAreaView edges={['top']} style={styles.overlay}>
        <SearchBar value={query} onChange={setQuery} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    pointerEvents: 'box-none',
  },
});
