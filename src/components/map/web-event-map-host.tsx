import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WebEventMap } from '@/components/map/web-event-map';
import { useBubbleMode } from '@/hooks/use-bubble-mode';
import { useMapCamera } from '@/hooks/use-map-camera';
import { useMapSelection } from '@/hooks/use-map-selection';
import { usePinIconUrls } from '@/hooks/use-pin-icon-urls';
import type { StockholmEvent } from '@/types/event';
import type { GeoPoint } from '@/utils/geo';
import { eventPoint } from '@/utils/geo';
import {
  MAP_CLUSTER_BELOW_ZOOM,
  MAP_NEIGHBOURHOOD_ZOOM,
  visibleMapPins,
} from '@/utils/map-density';

const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };

/**
 * Web selection + pin pipeline, mirroring the native EventMap: same pin
 * clustering, same bubble icons (as data-URIs), same camera model. Camera
 * placement follows the origin prop; cluster taps push a one-shot camera focus.
 */
export function WebEventMapHost({
  events,
  favoriteIds,
  userLocation,
  focusEventId,
  selectedId: controlledId,
  onSelectedIdChange,
}: {
  events: StockholmEvent[];
  favoriteIds: ReadonlySet<string>;
  userLocation: GeoPoint | null;
  focusEventId: string | null;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
}) {
  const focusPoint = useMemo(() => {
    if (!focusEventId) return null;
    const event = events.find((item) => item.id === focusEventId);
    return event ? eventPoint(event) ?? null : null;
  }, [events, focusEventId]);
  const origin = focusPoint ?? userLocation ?? STOCKHOLM;
  const internal = useMapSelection(events, focusEventId);
  const controlled = onSelectedIdChange !== undefined;
  const selectedId = controlled
    ? controlledId && events.some((event) => event.id === controlledId)
      ? controlledId
      : null
    : internal.selectedId;
  const select = controlled ? onSelectedIdChange : internal.select;
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
  const iconUrls = usePinIconUrls(pins, showTitles, uiScale, favoriteIds, selectedId);

  const cameraPosition = useMemo(
    () => ({
      coordinates: { latitude: origin.latitude, longitude: origin.longitude },
      zoom: MAP_NEIGHBOURHOOD_ZOOM,
    }),
    [origin.latitude, origin.longitude],
  );

  const [clusterFocus, setClusterFocus] = useState<{
    coordinates: GeoPoint;
    zoom: number;
  } | null>(null);

  const onPinClick = (id: string | undefined) => {
    if (!id) return;
    const pin = pinsRef.current.find((item) => item.id === id);
    if (!pin) return;
    if (pin.kind === 'cluster') {
      setClusterFocus({
        coordinates: pin.point,
        zoom: Math.min(Math.max(cameraRef.current.zoom + 2, MAP_CLUSTER_BELOW_ZOOM), 16),
      });
      return;
    }
    select(pin.event.id);
  };

  return (
    <View style={styles.root}>
      <WebEventMap
        cameraPosition={clusterFocus ?? cameraPosition}
        pins={pins}
        icons={iconUrls}
        selectedId={selectedId}
        onPinClick={onPinClick}
        onMapClick={() => select(null)}
        onCameraMove={onCameraMove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
