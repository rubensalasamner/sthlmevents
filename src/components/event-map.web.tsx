import { StyleSheet } from 'react-native';

import { EventList } from '@/components/event-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { EventMapProps } from '@/components/event-map';

/**
 * `expo-maps` has no web support, so on web we fall back to the event list with
 * a note. The native map lives in `event-map.tsx` and is used on iOS/Android.
 */
export function EventMap({ events, loading, error, onRetry }: EventMapProps) {
  return (
    <EventList
      events={events}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyMessage="No events to show on the map."
      ListHeaderComponent={
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText type="small" themeColor="textSecondary">
            The interactive map is available in the iOS and Android app. Here are the same events
            as a list.
          </ThemedText>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
});
