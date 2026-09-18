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
    const weekEnd = stockholmMidnight(7, new Date()).getTime();
    return [
      { title: 'This week', data: saved.filter((event) => new Date(event.startsAt).getTime() < weekEnd) },
      { title: 'Later', data: saved.filter((event) => new Date(event.startsAt).getTime() >= weekEnd) },
    ];
  }, [saved]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <EventSectionList
          sections={sections}
          emptyMessage="Never miss a happening! You'll find all your saved events here."
          ListHeaderComponent={
            <View style={styles.pad}>
              <ThemedText type="title" style={styles.title}>
                Saved
              </ThemedText>
              {loading && saved.length === 0 ? (
                <ThemedText themeColor="textSecondary">Loading…</ThemedText>
              ) : null}
              {error ? (
                <ThemedText themeColor="textSecondary" onPress={reload}>
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
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
});
