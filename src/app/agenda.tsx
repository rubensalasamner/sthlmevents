import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { DateFilter } from '@/components/date-filter';
import { EventSectionList } from '@/components/event-section-list';
import { FilterSheet } from '@/components/filter-sheet';
import { FilterSummaryChip } from '@/components/filter-summary-chip';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/hooks/use-filtered-events';
import { useTheme } from '@/hooks/use-theme';
import { groupAgenda } from '@/utils/agenda-groups';

export default function AgendaScreen() {
  const { query, dateRange, setQuery, setDateRange } = useFilters();
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
          emptyMessage="No events match your filters."
          ListHeaderComponent={
            <View style={styles.header}>
              <SearchBar value={query} onChange={setQuery} />
              <DateFilter value={dateRange} onChange={setDateRange} />
              <View style={styles.chipRow}>
                <FilterSummaryChip onPress={() => setFiltersOpen(true)} />
                {listPending ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
              </View>
              {loading && listEvents.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.message}>
                  Loading…
                </ThemedText>
              ) : null}
              {error ? (
                <ThemedText themeColor="textSecondary" style={styles.message} onPress={reload}>
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
    paddingHorizontal: Spacing.four,
  },
  message: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
