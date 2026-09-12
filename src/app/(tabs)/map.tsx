import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedView } from '@/components/themed-view';
import { useFilters } from '@/context/filters-context';
import { useEvents } from '@/hooks/use-events';
import { collapseSeries } from '@/utils/collapse-series';
import { splitByDateRange } from '@/utils/date-range';
import { searchEvents } from '@/utils/search';

export default function MapScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { category, query, dateRange, source, setQuery } = useFilters();

  const filtered = useMemo(() => {
    let result = searchEvents(events, query);
    if (category !== 'all') {
      result = result.filter((event) => event.category === category);
    }
    if (source !== 'all') {
      result = result.filter((event) => event.source === source);
    }
    // The map mirrors the Discover selection: primary + secondary (ongoing
    // carryover) both deserve a pin when the user narrows to a window.
    const { primary, secondary } = splitByDateRange(result, dateRange);
    const selected = dateRange === 'all' ? result : [...primary, ...secondary];
    // One pin per event, not one per occurrence of a recurring event.
    return collapseSeries(selected).events;
  }, [events, category, query, dateRange, source]);

  return (
    <ThemedView style={styles.container}>
      {/* Map runs under the safe area so the image is full-bleed like the reference. */}
      <View style={styles.mapWrap}>
        <EventMap events={filtered} loading={loading} error={error} onRetry={reload} />
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