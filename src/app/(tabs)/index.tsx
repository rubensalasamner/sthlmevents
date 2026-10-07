import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';

import { EmptyEventsState } from '@/components/empty-events-state';
import { EventPresentation } from '@/components/event-presentation';
import { FilterBar } from '@/components/filter-bar';
import { FilterSheet } from '@/components/filter-sheet';
import { Icon } from '@/components/icon';
import { InterestsEntry } from '@/components/interests-entry';
import { MagazineRailRow } from '@/components/magazine-rail';
import { SourceFilter } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useFilteredEvents } from '@/hooks/use-filtered-events';
import { useTheme } from '@/hooks/use-theme';
import { buildMagazine, railCategoryFilter, railShowsCategory } from '@/utils/magazine-rails';

const TITLE_UNLOCK_TAPS = 5;
const TITLE_UNLOCK_MS = 1600;

export default function HomeScreen() {
  const {
    events,
    loading,
    error,
    reload,
    listEvents,
    heading,
    listPending,
    nearStatus,
  } = useFilteredEvents();
  const { source, setSource, setCategory, devSourcesUnlocked, toggleDevSources } = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const magazine = useMemo(() => buildMagazine(listEvents, heading), [listEvents, heading]);
  const taps = useRef({ count: 0, at: 0 });

  const openAgenda = () => router.push('/agenda' as Href);

  const onHeadingPress = () => {
    if (!__DEV__) return;
    const now = Date.now();
    if (now - taps.current.at > TITLE_UNLOCK_MS) taps.current.count = 0;
    taps.current.at = now;
    taps.current.count += 1;
    if (taps.current.count >= TITLE_UNLOCK_TAPS) {
      taps.current.count = 0;
      toggleDevSources();
    }
  };

  const onRailSeeAll = (railId: string) => {
    const category = railCategoryFilter(railId);
    if (category) setCategory(category);
    openAgenda();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Pressable
                onPress={onHeadingPress}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="display">{heading}</ThemedText>
              </Pressable>
              {devSourcesUnlocked ? (
                <ThemedText type="meta" themeColor="textSecondary">
                  {listEvents.length} events
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {listPending ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
              <InterestsEntry />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse all events"
                onPress={openAgenda}
                hitSlop={Spacing.two}
                style={({ pressed }) => pressed && styles.pressed}>
                <Icon sf="magnifyingglass" material="search" size={22} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <FilterBar hideDate onPress={() => setFiltersOpen(true)} />
          <SourceFilter
            events={events}
            value={source}
            onChange={setSource}
            unlocked={devSourcesUnlocked}
          />

          {loading && listEvents.length === 0 ? (
            <ActivityIndicator color={theme.textSecondary} style={styles.loader} />
          ) : error ? (
            <Pressable onPress={reload} style={styles.messageWrap}>
              <ThemedText type="meta" themeColor="textSecondary">
                Could not load events. Tap to retry.
              </ThemedText>
            </Pressable>
          ) : !magazine.hero ? (
            <EmptyEventsState
              message="No events match your filters."
              showReset
              showExplore
            />
          ) : (
            <>
              <View style={styles.hero}>
                <EventPresentation event={magazine.hero} variant="hero" />
              </View>
              {magazine.rails.map((rail) => (
                <MagazineRailRow
                  key={rail.id}
                  title={rail.title}
                  events={rail.events}
                  density={rail.density}
                  showCategory={railShowsCategory(rail.id)}
                  onSeeAll={() => onRailSeeAll(rail.id)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse all events"
                onPress={openAgenda}
                style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
                <ThemedText type="link">Browse all</ThemedText>
                <Icon sf="chevron.right" material="arrow_forward" size={16} color={theme.accent} />
              </Pressable>
            </>
          )}
        </ScrollView>
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
  scroll: {
    flexGrow: 0,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.half,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  hero: {
    paddingHorizontal: Spacing.four,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  loader: {
    marginTop: Spacing.six,
  },
  messageWrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
