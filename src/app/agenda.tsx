import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { EventSectionList } from '@/components/event-section-list';
import { FilterBar } from '@/components/filter-bar';
import { FilterSheet } from '@/components/filter-sheet';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/context/filtered-events-context';
import { useTheme } from '@/hooks/use-theme';
import { EVENT_CATEGORIES, type EventCategory } from '@/types/event';
import { groupAgenda } from '@/utils/agenda-groups';

function parseCategory(value: string | string[] | undefined): EventCategory | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return EVENT_CATEGORIES.find((category) => category === raw);
}

/**
 * Drill-downs (rail "See all", search) belong to this visit: the category a
 * rail applied is restored and the query cleared when the agenda closes, so
 * Home and Explore aren't silently left filtered.
 */
function useAgendaScope(category: EventCategory | undefined) {
  const { category: current, setCategory, setQuery } = useFilters();
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    const previous = currentRef.current;
    if (category) setCategory(category);
    return () => {
      setQuery('');
      if (category && currentRef.current === category) setCategory(previous);
    };
  }, [category, setCategory, setQuery]);
}

export default function AgendaScreen() {
  const params = useLocalSearchParams<{ category?: string; focus?: string }>();
  useAgendaScope(parseCategory(params.category));
  const { query, setQuery } = useFilters();
  const { events, loading, error, reload, listEvents, listPending, nearStatus, now } =
    useFilteredEvents();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const theme = useTheme();
  const sections = useMemo(
    () => groupAgenda(listEvents, now).map((group) => ({ title: group.label, data: group.events })),
    [listEvents, now],
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'All events', headerBackTitle: 'Home' }} />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <EventSectionList
          sections={sections}
          loading={loading && listEvents.length === 0}
          emptyMessage="No events match your filters."
          showEmptyReset
          showEmptyExplore
          now={now}
          ListHeaderComponent={
            <View style={styles.header}>
              <SearchBar value={query} onChange={setQuery} autoFocus={params.focus === 'search'} />
              <View style={styles.chipRow}>
                <View style={styles.bar}>
                  <FilterBar onPress={() => setFiltersOpen(true)} />
                </View>
                {listPending ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
              </View>
              {error ? (
                <ThemedText
                  type="meta"
                  themeColor="textSecondary"
                  style={styles.message}
                  onPress={reload}>
                  Could not load events. Tap to retry.
                </ThemedText>
              ) : null}
            </View>
          }
        />
      </SafeAreaView>
      <FilterSheet
        events={events}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        nearStatus={nearStatus}
        resultCount={listEvents.length}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    gap: Spacing.two,
    marginHorizontal: -Spacing.three,
    paddingBottom: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  bar: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
