import type { ImageRef } from 'expo-image';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { hasMapsApiKey, hasNativeMaps, MapUnavailable } from '@/components/map/map-availability';
import { MapEventPeek } from '@/components/map-event-peek';
import { useBubbleMode } from '@/hooks/use-bubble-mode';
import { useMapCamera } from '@/hooks/use-map-camera';
import { useMapSelection } from '@/hooks/use-map-selection';
import { usePinIcons } from '@/hooks/use-pin-icons';
import type { StockholmEvent } from '@/types/event';
import type { GeoPoint } from '@/utils/geo';
import { eventPoint } from '@/utils/geo';
import {
  MAP_CLUSTER_BELOW_ZOOM,
  MAP_NEIGHBOURHOOD_ZOOM,
  visibleMapPins,
} from '@/utils/map-density';

const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };

type MapCameraHandle = {
  setCameraPosition?: (config: {
    coordinates: GeoPoint;
    zoom: number;
  }) => Promise<void> | void;
};

export type EventMapProps = {
  events: StockholmEvent[];
  favoriteIds?: ReadonlySet<string>;
  userLocation?: GeoPoint | null;
  focusEventId?: string | null;
  /** Controlled selection — when set with onSelectedIdChange, parent owns it. */
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  /**
   * Floating one-event peek. Off when Explore shows the detent list sheet
   * (peek and sheet both claim the bottom edge).
   */
  showPeek?: boolean;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

type MapRendererProps = {
  mapRef: RefObject<MapCameraHandle | null>;
  cameraPosition: { coordinates: GeoPoint; zoom: number };
  markers: Array<{
    id: string;
    coordinates: GeoPoint;
    icon: ImageRef;
    showCallout: false;
    anchor: { x: number; y: number };
    zIndex: number;
  }>;
  annotations: Array<{ id: string; coordinates: GeoPoint; icon: ImageRef }>;
  /** Fires once the Android map has loaded — cameraState is safe to use after. */
  onMapLoaded: () => void;
  onPinClick: (id: string | undefined) => void;
  onMapClick: () => void;
  onCameraMove: ReturnType<typeof useMapCamera>['onCameraMove'];
};

/** Platform map strategy — Apple annotations vs Google markers. */
const mapRenderers: Record<'ios' | 'android', (props: MapRendererProps) => ReactElement> = {  ios: ({ mapRef, cameraPosition, annotations, onPinClick, onMapClick, onCameraMove }) => {
    const { AppleMaps } = require('expo-maps') as typeof import('expo-maps');
    return (
      <AppleMaps.View
        ref={mapRef as never}
        style={styles.map}
        cameraPosition={cameraPosition}
        annotations={annotations}
        onAnnotationClick={(annotation) => onPinClick(annotation.id)}
        onMapClick={onMapClick}
        onCameraMove={onCameraMove}
      />
    );
  },
  android: ({ mapRef, cameraPosition, markers, onPinClick, onMapClick, onCameraMove, onMapLoaded }) => {
    const { GoogleMaps } = require('expo-maps') as typeof import('expo-maps');
    return (
      <GoogleMaps.View
        ref={mapRef as never}
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={markers}
        onMarkerClick={(marker) => onPinClick(marker.id)}
        onMapClick={onMapClick}
        onCameraMove={onCameraMove}
        onMapLoaded={onMapLoaded}
      />
    );
  },
};

export function EventMap({
  events,
  favoriteIds,
  userLocation,
  focusEventId,
  selectedId,
  onSelectedIdChange,
  showPeek = true,
}: EventMapProps) {
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
      focusEventId={focusEventId ?? null}
      selectedId={selectedId}
      onSelectedIdChange={onSelectedIdChange}
      showPeek={showPeek}
    />
  );
}

function NativeEventMap({
  events,
  favoriteIds,
  userLocation,
  focusEventId,
  selectedId: controlledId,
  onSelectedIdChange,
  showPeek,
}: {
  events: StockholmEvent[];
  favoriteIds: ReadonlySet<string>;
  userLocation: GeoPoint | null;
  focusEventId: string | null;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  showPeek: boolean;
}) {
  const focusPoint = useMemo(() => {
    if (!focusEventId) return null;
    const event = events.find((item) => item.id === focusEventId);
    return event ? eventPoint(event) ?? null : null;
  }, [events, focusEventId]);
  const origin = focusPoint ?? userLocation ?? STOCKHOLM;
  const mapRef = useRef<MapCameraHandle>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const controlled = onSelectedIdChange !== undefined;
  const internal = useMapSelection(events, focusEventId);
  const selectedId = controlled
    ? controlledId && events.some((event) => event.id === controlledId)
      ? controlledId
      : null
    : internal.selectedId;
  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );
  const select = controlled ? onSelectedIdChange : internal.select;
  const clear = controlled ? () => onSelectedIdChange(null) : internal.clear;
  const { camera, cameraRef, onCameraMove } = useMapCamera(origin);
  const pins = useMemo(
    () => visibleMapPins(events, camera, { selectedId }),
    [events, camera, selectedId],
  );
  const pinsRef = useRef(pins);
  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);
  const { showTitles, uiScale } = useBubbleMode(camera.zoom, events.length);
  const bubbleIcons = usePinIcons(pins, showTitles, uiScale, favoriteIds, selectedId);

  // Camera placement is owned entirely by the `cameraPosition` prop (derived from
  // origin). Imperative `setCameraPosition` is reserved for cluster-tap zoom, where
  // no prop change exists. Calling it for origin changes duplicates the prop update
  // and races the native camera state — the pending animation is cancelled when the
  // prop re-creates the camera state, rejecting with CancellationException.
  const animateCamera = (config: { coordinates: GeoPoint; zoom: number }) => {
    mapRef.current?.setCameraPosition?.(config)?.catch?.(() => {
      // Android cancels pending animations when the camera state is recreated;
      // harmless — the prop-driven position already reflects the new origin.
    });
  };

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
      // Before onMapLoaded the native cameraState is not initialized yet;
      // the cameraPosition prop already targets the origin, so skip the call.
      if (!mapLoaded) return;
      const zoom = Math.min(Math.max(cameraRef.current.zoom + 2, MAP_CLUSTER_BELOW_ZOOM), 16);
      animateCamera({ coordinates: pin.point, zoom });
      return;
    }
    select(pin.event.id);
  };

  const markers = useMemo(
    () =>
      pins.flatMap((pin) => {
        const icon = bubbleIcons.get(pin.id);
        if (!icon) return [];
        const selected = pin.kind === 'event' && pin.event.id === selectedId;
        return [
          {
            id: pin.id,
            coordinates: pin.point,
            icon,
            showCallout: false as const,
            anchor: { x: 0.5, y: 1 },
            zIndex: selected ? 10 : 0,
          },
        ];
      }),
    [pins, bubbleIcons, selectedId],
  );

  const annotations = useMemo(
    () =>
      pins.flatMap((pin) => {
        const icon = bubbleIcons.get(pin.id);
        if (!icon) return [];
        return [{ id: pin.id, coordinates: pin.point, icon }];
      }),
    [pins, bubbleIcons],
  );

  const renderMap = Platform.OS === 'ios' ? mapRenderers.ios : mapRenderers.android;

  return (
    <View style={styles.root}>
      {renderMap({
        mapRef,
        cameraPosition,
        markers,
        annotations,
        onMapLoaded: () => setMapLoaded(true),
        onPinClick,
        onMapClick: clear,
        onCameraMove,
      })}
      {showPeek && selected ? <MapEventPeek event={selected} onDismiss={clear} /> : null}
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
});
