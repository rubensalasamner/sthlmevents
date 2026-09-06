import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

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

export function EventMap({ events }: EventMapProps) {
  const router = useRouter();

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
