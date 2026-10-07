import { useRef, useState } from 'react';

import type { GeoPoint } from '@/utils/geo';
import {
  boundsAround,
  boundsFromDeltas,
  cameraMovedEnough,
  MAP_NEIGHBOURHOOD_ZOOM,
  type MapCameraSnapshot,
} from '@/utils/map-density';

export type CameraMoveEvent = {
  zoom?: number;
  coordinates?: { latitude?: number; longitude?: number };
  latitudeDelta?: number;
  longitudeDelta?: number;
};

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

export function useMapCamera(origin: GeoPoint) {
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
