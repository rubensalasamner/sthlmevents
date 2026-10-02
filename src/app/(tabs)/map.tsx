import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { FilterBar } from '@/components/filter-bar';
import { FilterSheet } from '@/components/filter-sheet';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useFilteredEvents } from '@/hooks/use-filtered-events';
import { mappableEvents } from '@/utils/map-marker';

export default function MapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const focusEventId = typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : undefined;
  const { events, listEvents, loading, error, reload, nearStatus, location } = useFilteredEvents();
  const { favoriteIds } = useFavorites();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mappable = useMemo(() => mappableEvents(listEvents), [listEvents]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapWrap}>
        <EventMap
          events={mappable}
          favoriteIds={favoriteIds}
          userLocation={location}
          focusEventId={focusEventId}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      </View>
      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <View style={styles.chipRow} pointerEvents="auto">
          <FilterBar onPress={() => setFiltersOpen(true)} />
        </View>
      </SafeAreaView>
      <FilterSheet
        events={events}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        nearStatus={nearStatus}
        resultCount={mappable.length}
      />
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
  chipRow: {
    paddingTop: Spacing.two,
    pointerEvents: 'box-none',
  },
});
