import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventSectionList } from '@/components/event-section-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useEvents } from '@/hooks/use-events';
import { groupAgenda } from '@/utils/agenda-groups';
import { eventInterval } from '@/utils/event-interval';

export default function SavedScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { favoriteIds } = useFavorites();

  const saved = useMemo(
    () => events.filter((event) => favoriteIds.has(event.id)),
    [events, favoriteIds],
  );

  const grouped = useMemo(() => {
    const now = new Date();
    const upcoming: typeof saved = [];
    const past: typeof saved = [];

    for (const event of saved) {
      if (eventInterval(event).endMs < now.getTime()) past.push(event);
      else upcoming.push(event);
    }

    const upcomingSections = groupAgenda(upcoming, now).map((group) => ({
      title: group.label,
      data: group.events,
    }));

    return {
      now,
      sections: [
        ...upcomingSections,
        {
          title: 'Past',
          data: [...past].sort((a, b) => eventInterval(b).endMs - eventInterval(a).endMs),
        },
      ],
    };
  }, [saved]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <EventSectionList
          sections={grouped.sections}
          loading={loading && saved.length === 0}
          emptyMessage="Save events you care about — they'll show up here."
          now={grouped.now}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="display">Saved</ThemedText>
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
  header: {
    marginHorizontal: -Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
});
