import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventList } from '@/components/event-list';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { useFavorites } from '@/context/favorites-context';
import { useEvents } from '@/hooks/use-events';

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader title="Saved" subtitle="Events you’ve bookmarked" />
        <EventList
          events={saved}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage="Tap the heart on an event to save it here."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
