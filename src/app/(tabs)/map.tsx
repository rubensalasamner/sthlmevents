import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { FilterBar } from '@/components/filter-bar';
import { FilterSheet } from '@/components/filter-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/context/filtered-events-context';
import { mappableEvents } from '@/utils/map-marker';

export default function MapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const focusEventId =
    typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : undefined;
  const { events, listEvents, loading, error, reload, nearStatus, location } = useFilteredEvents();
  const { isActive, reset } = useFilters();
  const { favoriteIds } = useFavorites();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mappable = useMemo(() => mappableEvents(listEvents), [listEvents]);

  const status = loading
    ? { text: 'Loading events…', onPress: undefined as (() => void) | undefined }
    : error
      ? { text: "Couldn't load events · Retry", onPress: reload }
      : !loading && mappable.length === 0
        ? {
            text: isActive
              ? 'No events on the map for these filters · Reset'
              : 'No events with a location for this window',
            onPress: isActive ? reset : undefined,
          }
        : null;

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
          <FilterBar onPress={() => setFiltersOpen(true)} />
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
