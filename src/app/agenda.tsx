import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { DayStrip } from '@/components/day-strip';
import { EventSectionList, type EventSectionListHandle } from '@/components/event-section-list';
import { FilterBar } from '@/components/filter-bar';
import { SearchBar } from '@/components/search-bar';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilterSheet } from '@/context/filter-sheet-context';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/context/filtered-events-context';
import { useTheme } from '@/hooks/use-theme';
import { EVENT_CATEGORIES, type EventCategory } from '@/types/event';
import { agendaDays, groupAgenda } from '@/utils/agenda-groups';

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
  const { openFilters } = useFilterSheet();
  const { loading, error, reload, listEvents, listPending, now } = useFilteredEvents();
  const theme = useTheme();
  const listRef = useRef<EventSectionListHandle>(null);

  const groups = useMemo(() => groupAgenda(listEvents, now), [listEvents, now]);
  const sections = useMemo(
    () =>
      groups.map((group) => ({
        key: group.id,
        title: group.label,
        dayKey: group.dayKey,
        data: group.events,
      })),
    [groups],
  );
  const days = useMemo(() => agendaDays(groups, now), [groups, now]);

  const [topDay, setTopDay] = useState<string | null>(null);
  const activeDay = days.some((day) => day.key === topDay) ? topDay : (days[0]?.key ?? null);

  const jumpToDay = (dayKey: string) => {
    setTopDay(dayKey);
    listRef.current?.scrollToDay(dayKey);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'All events', headerBackTitle: 'Home' }} />
      <View style={styles.header}>
        <SearchBar value={query} onChange={setQuery} autoFocus={params.focus === 'search'} />
        <View style={styles.chipRow}>
          <View style={styles.bar}>
            <FilterBar onPress={() => openFilters()} />
          </View>
          {listPending ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
        </View>
        {days.length > 1 ? (
          <DayStrip days={days} activeKey={activeDay} onSelect={jumpToDay} />
        ) : null}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <EventSectionList
          ref={listRef}
          sections={sections}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage="No events match your filters."
          showEmptyReset
          showEmptyExplore
          now={now}
          onTopDayChange={setTopDay}
        />
      </SafeAreaView>
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
    paddingTop: Spacing.two,
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
});
