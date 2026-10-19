import { StyleSheet } from 'react-native';

import { EventList } from '@/components/event-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { WebEventMapHost } from '@/components/map/web-event-map-host';
import type { EventMapProps } from '@/components/event-map';

/**
 * Web entry for the map. Metro platform extension resolves this file instead of
 * `event-map.tsx` on web. Google Maps JS renders when a browser key is present
 * (EXPO_PUBLIC_GOOGLE_MAPS_KEY); otherwise the same event list fallback as before.
 */
export function EventMap({ events, loading, error, onRetry }: EventMapProps) {
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY) {
    return (
      <WebEventMapHost
        events={events}
        favoriteIds={new Set()}
        userLocation={null}
        focusEventId={null}
      />
    );
  }
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
            The interactive map needs a web maps key (EXPO_PUBLIC_GOOGLE_MAPS_KEY). Here are the
            same events as a list.
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
