import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { FilterBar } from '@/components/filter-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useFilterSheet, type ResultCounter } from '@/context/filter-sheet-context';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/context/filtered-events-context';
import { resolveEventsStatus, type EventsStatusKind } from '@/utils/events-status';
import { mappableEvents } from '@/utils/map-marker';

const countMappable: ResultCounter = (events) => mappableEvents(events).length;

export default function MapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const focusEventId =
    typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : undefined;
  const { listEvents, loading, error, reload, location } = useFilteredEvents();
  const { isActive, reset } = useFilters();
  const { favoriteIds } = useFavorites();
  const { openFilters } = useFilterSheet();
  const mappable = useMemo(() => mappableEvents(listEvents), [listEvents]);

  const status = mapStatus(
    resolveEventsStatus({ loading, error, empty: mappable.length === 0 }),
    isActive,
    reload,
    reset,
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapWrap}>
        <EventMap
          events={mappable}
          favoriteIds={favoriteIds}
          userLocation={location}
          focusEventId={focusEventId}
        />
      </View>
      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <View style={styles.chipRow} pointerEvents="auto">
          <FilterBar onPress={() => openFilters(countMappable)} />
          {status ? (
            <Pressable
              accessibilityRole={status.onPress ? 'button' : undefined}
              onPress={status.onPress}
              disabled={!status.onPress}
              style={({ pressed }) => pressed && status.onPress && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.status}>
                <ThemedText type="meta" themeColor="textSecondary">
                  {status.text}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

type MapStatus = { text: string; onPress?: () => void } | null;

function mapStatus(
  kind: EventsStatusKind,
  filtersActive: boolean,
  retry: () => void,
  reset: () => void,
): MapStatus {
  switch (kind) {
    case 'ready':
      return null;
    case 'loading':
      return { text: 'Loading events…' };
    case 'error':
      return { text: "Couldn't load events · Retry", onPress: retry };
    case 'empty':
      return filtersActive
        ? { text: 'No events on the map for these filters · Reset', onPress: reset }
        : { text: 'No events with a location for this window' };
  }
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
    gap: Spacing.two,
    pointerEvents: 'box-none',
  },
  status: {
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.75,
  },
});
