import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { HeroPoster } from '@/components/event-presentation/hero-poster';
import { EventsStatus } from '@/components/events-status';
import { FilterBar } from '@/components/filter-bar';
import { Icon } from '@/components/icon';
import { InterestsEntry } from '@/components/interests-entry';
import { MagazineRailRow } from '@/components/magazine-rail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilterSheet } from '@/context/filter-sheet-context';
import { useFilteredEvents } from '@/context/filtered-events-context';
import { useFilters } from '@/context/filters-context';
import { useInterests } from '@/context/interests-context';
import { useTheme } from '@/hooks/use-theme';
import { buildMagazine, railCategoryFilter, railShowsCategory } from '@/utils/magazine-rails';

export default function HomeScreen() {
  const { loading, error, reload, listEvents, heading, listPending } = useFilteredEvents();
  const { devSourcesUnlocked } = useFilters();
  const { maybePrompt } = useInterests();
  const { openFilters } = useFilterSheet();
  const router = useRouter();
  const theme = useTheme();
  const magazine = useMemo(() => buildMagazine(listEvents, heading), [listEvents, heading]);

  useFocusEffect(
    useCallback(() => {
      maybePrompt();
    }, [maybePrompt]),
  );

  const openAgenda = (params?: { category?: string; focus?: string }) => {
    router.push({ pathname: '/agenda', params } as Href);
  };

  const onRailSeeAll = (railId: string) => {
    const category = railCategoryFilter(railId);
    openAgenda(category ? { category } : undefined);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Filters, ${heading}`}
                onPress={() => openFilters()}
                style={({ pressed }) => [styles.headingHit, pressed && styles.pressed]}>
                <ThemedText type="display">{heading}</ThemedText>
                <Icon sf="chevron.down" material="expand_more" size={20} color={theme.textSecondary} />
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
                onPress={() => openAgenda({ focus: 'search' })}
                hitSlop={Spacing.two}
                style={({ pressed }) => pressed && styles.pressed}>
                <Icon sf="magnifyingglass" material="search" size={22} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <FilterBar hideDate onPress={() => openFilters()} />

          <EventsStatus
            loading={loading}
            error={error}
            empty={!magazine.hero}
            onRetry={reload}
            showReset
            showExplore>
            {magazine.hero ? (
              <View style={styles.hero}>
                <HeroPoster event={magazine.hero} />
              </View>
            ) : null}
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
              onPress={() => openAgenda()}
              style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
              <ThemedText type="link">Browse all</ThemedText>
              <Icon sf="chevron.right" material="arrow_forward" size={16} color={theme.accent} />
            </Pressable>
          </EventsStatus>
        </ScrollView>
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
  headingHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
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
  pressed: {
    opacity: 0.7,
  },
});
