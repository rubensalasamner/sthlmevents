import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedView } from '@/components/themed-view';
import { useEvents } from '@/hooks/use-events';
import { collapseSeries } from '@/utils/collapse-series';

export default function MapScreen() {
  const { data: events, loading, error, reload } = useEvents();
  // One pin per event, not one per occurrence of a recurring event.
  const collapsed = useMemo(() => collapseSeries(events).events, [events]);

  return (
    <ThemedView style={styles.container}>
      {/* Map runs under the safe area so the image is full-bleed like the reference. */}
      <View style={styles.mapWrap}>
        <EventMap events={collapsed} loading={loading} error={error} onRetry={reload} />
      </View>
      <SafeAreaView edges={['top']} style={styles.overlay}>
        <SearchBar value="" onChange={() => {}} placeholder="What are you looking for?" />
      </SafeAreaView>
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
});
