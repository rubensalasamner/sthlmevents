import { requireNativeModule } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatPrice } from '@/utils/format';

const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };
const DEFAULT_CAMERA = { coordinates: STOCKHOLM, zoom: 11 };

export type EventMapProps = {
  events: StockholmEvent[];
  /** Accepted for a shared interface with the web fallback; unused natively. */
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

let nativeMapsChecked = false;
let nativeMapsAvailable = false;

// expo-maps ships native code that is absent in Expo Go; probing the native
// module once lets the map screen degrade gracefully instead of crashing.
function hasNativeMaps(): boolean {
  if (!nativeMapsChecked) {
    nativeMapsChecked = true;
    try {
      requireNativeModule('ExpoMaps');
      nativeMapsAvailable = true;
    } catch {
      nativeMapsAvailable = false;
    }
  }
  return nativeMapsAvailable;
}

function MapUnavailable() {
  return (
    <ThemedView style={styles.unavailable}>
      <ThemedText type="subtitle">Map unavailable</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.unavailableText}>
        Maps need a development build and can&apos;t run inside Expo Go. Everything else works —
        browse events from the Events tab.
      </ThemedText>
    </ThemedView>
  );
}

export function EventMap({ events }: EventMapProps) {
  const router = useRouter();

  if (!hasNativeMaps()) {
    return <MapUnavailable />;
  }

  // Required lazily: importing expo-maps is only safe once the native module
  // has been confirmed to exist.
  const { AppleMaps, GoogleMaps } = require('expo-maps') as typeof import('expo-maps');

  const markers = events
    .filter(
      (event) => event.venue.latitude !== undefined && event.venue.longitude !== undefined,
    )
    .map((event) => ({
      id: event.id,
      coordinates: { latitude: event.venue.latitude!, longitude: event.venue.longitude! },
      title: event.title,
      snippet: `${event.venue.name} · ${formatPrice(event.priceSek)}`,
    }));

  const openEvent = (id?: string) => {
    if (id) router.push(`/event/${id}`);
  };

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={{ flex: 1 }}
        cameraPosition={DEFAULT_CAMERA}
        markers={markers}
        onMarkerClick={(marker) => openEvent(marker.id)}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={{ flex: 1 }}
      cameraPosition={DEFAULT_CAMERA}
      markers={markers}
      onMarkerClick={(marker) => openEvent(marker.id)}
    />
  );
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  unavailableText: {
    textAlign: 'center',
  },
});
