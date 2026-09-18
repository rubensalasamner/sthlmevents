import Constants from 'expo-constants';
import type { ImageRef } from 'expo-image';
import { requireNativeModule } from 'expo-modules-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { MapEventPeek } from '@/components/map-event-peek';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import type { GeoPoint } from '@/utils/geo';
import { loadBubbleIcon } from '@/utils/map-bubble-icon';
import {
  boundsAround,
  boundsFromDeltas,
  cameraMovedEnough,
  MAP_CLUSTER_BELOW_ZOOM,
  MAP_NEIGHBOURHOOD_ZOOM,
  visibleMapPins,
  type MapCameraSnapshot,
  type MapPin,
} from '@/utils/map-density';
import {
  MAP_BUBBLE_SCALE,
  MAP_TITLE_MAX_EVENTS,
  mapBubbleContent,
  mapBubbleSizeTier,
  mappableEvents,
  type MapBubbleSizeTier,
} from '@/utils/map-marker';

const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };

type CameraMoveEvent = {
  zoom?: number;
  coordinates?: { latitude?: number; longitude?: number };
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type MapCameraHandle = {
  setCameraPosition?: (config: { coordinates: GeoPoint; zoom: number }) => void;
};

export type EventMapProps = {
  events: StockholmEvent[];
  /** Favourited event ids — rendered with the favorite accent bubble. */
  favoriteIds?: ReadonlySet<string>;
  /** When set, the camera opens on the user instead of city centre. */
  userLocation?: GeoPoint | null;
  /** Accepted for a shared interface with the web fallback; unused natively. */
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

let nativeMapsChecked = false;
let nativeMapsAvailable = false;

/**
 * Expo Go ships no native maps module; built apps do. This gate exists so the
 * map screen degrades gracefully in Expo Go instead of crashing.
 */
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

function MapUnavailable({ title = 'Map unavailable' }: { title?: string }) {
  return (
    <ThemedView style={styles.unavailable}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.unavailableText}>
        {title === 'Map not configured'
          ? 'The maps API key is missing in this build. Everything else works — browse events from Home.'
          : 'Maps can’t run inside Expo Go. Everything else works — browse events from Home.'}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * The native module existing is not enough: without a Google Maps key in the
 * embedded manifest, mounting GoogleMaps.View crashes the whole app natively.
 * Expo strips the key itself from the JS-visible config in built apps, so the
 * gate reads the `extra.mapsConfigured` flag baked in at build time.
 */
function hasMapsApiKey(): boolean {
  return Constants.expoConfig?.extra?.mapsConfigured === true;
}

function useSelectedEvent(events: StockholmEvent[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      setSelectedId(null);
    }
  }, [events, selectedId]);

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

  return {
    selectedId,
    selected,
    select: (id: string | null) => setSelectedId(id),
    clear: () => setSelectedId(null),
  };
}

function snapshotFromMove(event: CameraMoveEvent, fallback: MapCameraSnapshot): MapCameraSnapshot {
  const latitude = event.coordinates?.latitude ?? fallback.center.latitude;
  const longitude = event.coordinates?.longitude ?? fallback.center.longitude;
  const center = { latitude, longitude };
  const zoom = event.zoom ?? fallback.zoom;
  const bounds =
    event.latitudeDelta != null && event.longitudeDelta != null
      ? boundsFromDeltas(center, event.latitudeDelta, event.longitudeDelta)
      : boundsAround(center, zoom);
  return { center, zoom, bounds };
}

function useMapCamera(origin: GeoPoint) {
  const [camera, setCamera] = useState<MapCameraSnapshot>(() => ({
    center: origin,
    zoom: MAP_NEIGHBOURHOOD_ZOOM,
    bounds: boundsAround(origin, MAP_NEIGHBOURHOOD_ZOOM),
  }));
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const onCameraMove = (event: CameraMoveEvent) => {
    const next = snapshotFromMove(event, cameraRef.current);
    if (!cameraMovedEnough(cameraRef.current, next)) return;
    cameraRef.current = next;
    setCamera(next);
  };

  return { camera, cameraRef, onCameraMove };
}

function useBubbleMode(zoom: number, totalEvents: number) {
  const [tier, setTier] = useState<MapBubbleSizeTier>(() => mapBubbleSizeTier(zoom));
  const showTitles = totalEvents <= MAP_TITLE_MAX_EVENTS || zoom >= MAP_NEIGHBOURHOOD_ZOOM;
  const uiScale = MAP_BUBBLE_SCALE[tier];

  useEffect(() => {
    const next = mapBubbleSizeTier(zoom);
    setTier((prev) => (prev === next ? prev : next));
  }, [zoom]);

  return { showTitles, uiScale };
}

function pinSignature(
  pin: MapPin,
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
): string {
  if (pin.kind === 'cluster') {
    return `${pin.id}:${pin.count}:${uiScale}`;
  }
  const content = mapBubbleContent(pin.event, { showTitle });
  const favorite = favoriteIds.has(pin.event.id) ? '1' : '0';
  return `${pin.id}:${content.primary}|${content.secondary ?? ''}:${pin.event.category}:${favorite}:${uiScale}`;
}

function usePinIcons(
  pins: readonly MapPin[],
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
) {
  const [icons, setIcons] = useState<ReadonlyMap<string, ImageRef>>(new Map());
  const signature = pins.map((pin) => pinSignature(pin, showTitle, uiScale, favoriteIds)).join('||');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = new Map<string, ImageRef>();
      await Promise.all(
        pins.map(async (pin) => {
          try {
            if (pin.kind === 'cluster') {
              next.set(
                pin.id,
                await loadBubbleIcon({ primary: String(pin.count) }, Colors.dark.accent, uiScale),
              );
              return;
            }
            const content = mapBubbleContent(pin.event, { showTitle });
            const color = favoriteIds.has(pin.event.id)
              ? Colors.dark.favorite
              : CATEGORY_BADGE_COLORS[pin.event.category];
            next.set(pin.id, await loadBubbleIcon(content, color, uiScale));
          } catch {
            // Leave marker without a custom icon if the PNG fails to decode.
          }
        }),
      );
      if (!cancelled) setIcons(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by signature
  }, [signature]);

  return icons;
}

export function EventMap({ events, favoriteIds, userLocation }: EventMapProps) {
  if (!hasNativeMaps()) {
    return <MapUnavailable />;
  }

  if (!hasMapsApiKey()) {
    return <MapUnavailable title="Map not configured" />;
  }

  return (
    <NativeEventMap
      key={userLocation ? 'near' : 'city'}
      events={events}
      favoriteIds={favoriteIds ?? new Set()}
      userLocation={userLocation ?? null}
    />
  );
}

function NativeEventMap({
  events,
  favoriteIds,
  userLocation,
}: {
  events: StockholmEvent[];
  favoriteIds: ReadonlySet<string>;
  userLocation: GeoPoint | null;
}) {
  const { AppleMaps, GoogleMaps } = require('expo-maps') as typeof import('expo-maps');
  const origin = userLocation ?? STOCKHOLM;
  const mapRef = useRef<MapCameraHandle>(null);
  const mappable = useMemo(() => mappableEvents(events), [events]);
  const { selectedId, selected, select, clear } = useSelectedEvent(mappable);
  const { camera, cameraRef, onCameraMove } = useMapCamera(origin);
  const pins = useMemo(
    () => visibleMapPins(mappable, camera, { selectedId }),
    [mappable, camera, selectedId],
  );
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const { showTitles, uiScale } = useBubbleMode(camera.zoom, mappable.length);
  const bubbleIcons = usePinIcons(pins, showTitles, uiScale, favoriteIds);

  const originLat = origin.latitude;
  const originLng = origin.longitude;
  const cameraPosition = useMemo(
    () => ({
      coordinates: { latitude: originLat, longitude: originLng },
      zoom: MAP_NEIGHBOURHOOD_ZOOM,
    }),
    [originLat, originLng],
  );

  const onPinClick = (id: string | undefined) => {
    if (!id) return;
    const pin = pinsRef.current.find((item) => item.id === id);
    if (!pin) return;
    if (pin.kind === 'cluster') {
      const zoom = Math.min(Math.max(cameraRef.current.zoom + 2, MAP_CLUSTER_BELOW_ZOOM), 16);
      mapRef.current?.setCameraPosition?.({ coordinates: pin.point, zoom });
      return;
    }
    select(pin.event.id);
  };

  const markers = useMemo(
    () =>
      pins.flatMap((pin) => {
        const icon = bubbleIcons.get(pin.id);
        if (!icon) return [];
        return [
          {
            id: pin.id,
            coordinates: pin.point,
            icon,
            showCallout: false as const,
            anchor: { x: 0.5, y: 1 },
          },
        ];
      }),
    [pins, bubbleIcons],
  );

  const annotations = useMemo(
    () =>
      pins.flatMap((pin) => {
        const icon = bubbleIcons.get(pin.id);
        if (!icon) return [];
        return [
          {
            id: pin.id,
            coordinates: pin.point,
            icon,
          },
        ];
      }),
    [pins, bubbleIcons],
  );

  return (
    <View style={styles.root}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          // Native view handle; typed as never because expo-maps is required lazily.
          ref={mapRef as never}
          style={styles.map}
          cameraPosition={cameraPosition}
          annotations={annotations}
          onAnnotationClick={(annotation) => onPinClick(annotation.id)}
          onMapClick={clear}
          onCameraMove={onCameraMove}
        />
      ) : (
        <GoogleMaps.View
          ref={mapRef as never}
          style={styles.map}
          cameraPosition={cameraPosition}
          markers={markers}
          onMarkerClick={(marker) => onPinClick(marker.id)}
          onMapClick={clear}
          onCameraMove={onCameraMove}
        />
      )}
      {selected ? <MapEventPeek event={selected} onDismiss={clear} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
