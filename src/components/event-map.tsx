import Constants from 'expo-constants';
import type { ImageRef } from 'expo-image';
import { requireNativeModule } from 'expo-modules-core';
import { useEffect, useMemo, useState } from 'react';
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
  MAP_BUBBLE_SCALE,
  MAP_TITLE_MAX_EVENTS,
  mapBubbleContent,
  mapBubbleSizeTier,
  mappableEvents,
  type MapBubbleSizeTier,
} from '@/utils/map-marker';

const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };
const DEFAULT_CAMERA = { coordinates: STOCKHOLM, zoom: 11 };

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
          ? 'The maps API key is missing in this build. Everything else works — browse events from the Events tab.'
          : 'Maps can’t run inside Expo Go. Everything else works — browse events from the Events tab.'}
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

  return { selected, select: setSelectedId, clear: () => setSelectedId(null) };
}

/**
 * Discrete zoom tiers drive title unlock + bubble scale. Only commit when the
 * tier changes so pan ticks don't thrash PNG rebuilds.
 */
function useBubbleMode(eventCount: number) {
  const [tier, setTier] = useState<MapBubbleSizeTier>('sm');
  const showTitles = eventCount <= MAP_TITLE_MAX_EVENTS || tier !== 'sm';
  const uiScale = MAP_BUBBLE_SCALE[tier];

  const onCameraMove = (zoom: number) => {
    const next = mapBubbleSizeTier(zoom);
    setTier((prev) => (prev === next ? prev : next));
  };

  return { showTitles, uiScale, tier, onCameraMove };
}

/** Load PNG bubble bitmaps for both platforms (two-line title+time). */
function useBubbleIcons(
  events: StockholmEvent[],
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
) {
  const [icons, setIcons] = useState<ReadonlyMap<string, ImageRef>>(new Map());

  const signature = useMemo(
    () =>
      events
        .map((event) => {
          const content = mapBubbleContent(event, { showTitle });
          const favorite = favoriteIds.has(event.id) ? '1' : '0';
          return `${event.id}:${content.primary}|${content.secondary ?? ''}:${event.category}:${favorite}:${uiScale}`;
        })
        .join('||'),
    [events, showTitle, uiScale, favoriteIds],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = new Map<string, ImageRef>();
      await Promise.all(
        events.map(async (event) => {
          const content = mapBubbleContent(event, { showTitle });
          const color = favoriteIds.has(event.id)
            ? Colors.dark.favorite
            : CATEGORY_BADGE_COLORS[event.category];
          try {
            next.set(event.id, await loadBubbleIcon(content, color, uiScale));
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
  // Required lazily: importing expo-maps is only safe once the native module
  // has been confirmed to exist.
  const { AppleMaps, GoogleMaps } = require('expo-maps') as typeof import('expo-maps');

  const mappable = useMemo(() => mappableEvents(events), [events]);
  const { selected, select, clear } = useSelectedEvent(mappable);
  const { showTitles, uiScale, onCameraMove } = useBubbleMode(mappable.length);
  const bubbleIcons = useBubbleIcons(mappable, showTitles, uiScale, favoriteIds);

  const cameraPosition = useMemo(
    () =>
      userLocation
        ? { coordinates: userLocation, zoom: 13 }
        : DEFAULT_CAMERA,
    [userLocation],
  );

  // Only mount once the PNG exists — otherwise the platform default pin flashes.
  const markers = useMemo(
    () =>
      mappable.flatMap((event) => {
        const icon = bubbleIcons.get(event.id);
        if (!icon) return [];
        return [
          {
            id: event.id,
            coordinates: {
              latitude: event.venue.latitude!,
              longitude: event.venue.longitude!,
            },
            icon,
            showCallout: false as const,
            anchor: { x: 0.5, y: 1 },
          },
        ];
      }),
    [mappable, bubbleIcons],
  );

  const annotations = useMemo(
    () =>
      mappable.flatMap((event) => {
        const icon = bubbleIcons.get(event.id);
        if (!icon) return [];
        return [
          {
            id: event.id,
            coordinates: {
              latitude: event.venue.latitude!,
              longitude: event.venue.longitude!,
            },
            icon,
          },
        ];
      }),
    [mappable, bubbleIcons],
  );

  return (
    <View style={styles.root}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          key={userLocation ? 'near' : 'city'}
          style={styles.map}
          cameraPosition={cameraPosition}
          annotations={annotations}
          onAnnotationClick={(annotation) => {
            if (annotation.id) select(annotation.id);
          }}
          onMapClick={clear}
          onCameraMove={(event) => onCameraMove(event.zoom)}
        />
      ) : (
        <GoogleMaps.View
          key={userLocation ? 'near' : 'city'}
          style={styles.map}
          cameraPosition={cameraPosition}
          markers={markers}
          onMarkerClick={(marker) => {
            if (marker.id) select(marker.id);
          }}
          onMapClick={clear}
          onCameraMove={(event) => onCameraMove(event.zoom)}
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
