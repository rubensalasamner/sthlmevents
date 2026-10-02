import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventSectionList } from '@/components/event-section-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useEvents } from '@/hooks/use-events';
import { stockholmMidnight } from '@/utils/date-range';
import { eventInterval } from '@/utils/event-interval';

export default function SavedScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { favoriteIds } = useFavorites();

  const saved = useMemo(
    () =>
      events
        .filter((event) => favoriteIds.has(event.id))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events, favoriteIds],
  );

  const sections = useMemo(() => {
    const now = new Date();
    const weekEnd = stockholmMidnight(7, now).getTime();
    const past: typeof saved = [];
    const thisWeek: typeof saved = [];
    const later: typeof saved = [];

    for (const event of saved) {
      const { endMs } = eventInterval(event);
      if (endMs < now.getTime()) {
        past.push(event);
      } else if (new Date(event.startsAt).getTime() < weekEnd) {
        thisWeek.push(event);
      } else {
        later.push(event);
      }
    }

    return [
      { title: 'This week', data: thisWeek },
      { title: 'Later', data: later },
      {
        title: 'Past',
        data: [...past].sort(
          (a, b) => eventInterval(b).endMs - eventInterval(a).endMs,
        ),
      },
    ];
  }, [saved]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <EventSectionList
          sections={sections}
          emptyMessage="Save events you care about — they'll show up here."
          ListHeaderComponent={
            <View style={styles.pad}>
              <ThemedText type="display">Saved</ThemedText>
              {loading && saved.length === 0 ? (
                <ThemedText type="meta" themeColor="textSecondary">
                  Loading…
                </ThemedText>
              ) : null}
              {error ? (
                <ThemedText type="meta" themeColor="textSecondary" onPress={reload}>
                  Could not load events. Tap to retry.
                </ThemedText>
              ) : null}
            </View>
          }
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
  pad: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
});
