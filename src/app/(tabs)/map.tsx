import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventMap } from '@/components/event-map';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useEvents } from '@/hooks/use-events';

export default function MapScreen() {
  const { data: events, loading, error, reload } = useEvents();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader title="Map" subtitle="Events across Stockholm" />
        <View style={styles.mapWrap}>
          <EventMap events={events} loading={loading} error={error} onRetry={reload} />
        </View>
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
  mapWrap: {
    flex: 1,
    marginTop: Spacing.three,
  },
});
