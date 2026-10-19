import { useEffect, useRef, type CSSProperties } from 'react';

import { useGoogleMapsLoader } from '@/hooks/use-google-maps-loader';
import type { CameraMoveEvent } from '@/hooks/use-map-camera';
import type { GeoPoint } from '@/utils/geo';
import type { MapPin } from '@/utils/map-density';

type GoogleMapLike = {
  addListener: (event: string, handler: (payload: unknown) => void) => void;
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getCenter: () => { lat: () => number; lng: () => number };
  getZoom: () => number | undefined;
};

type GoogleMarkerLike = {
  setMap: (map: GoogleMapLike | null) => void;
  addListener: (event: string, handler: (payload: unknown) => void) => void;
};

type WebEventMapProps = {
  cameraPosition: { coordinates: GeoPoint; zoom: number };
  pins: readonly MapPin[];
  /** Pin id → PNG data-URI bubble (same assets as native markers). */
  icons: ReadonlyMap<string, string>;
  selectedId: string | null;
  onPinClick: (id: string | undefined) => void;
  onMapClick: () => void;
  onCameraMove: (event: CameraMoveEvent) => void;
};

const MIN_ZOOM = 3;

/**
 * Web map strategy — Google Maps JS API. Pins reuse the same PNG bubble icons
 * as native markers, so visual parity is free; clustering/selection flow through
 * the same callbacks as native. Markers are rebuilt per pin-set change, mirroring
 * the native prop-driven marker model.
 */
export function WebEventMap({
  cameraPosition,
  pins,
  icons,
  selectedId,
  onPinClick,
  onMapClick,
  onCameraMove,
}: WebEventMapProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  const { maps, failed } = useGoogleMapsLoader(apiKey);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapLike | null>(null);
  const markersRef = useRef<GoogleMarkerLike[]>([]);
  const handlersRef = useRef({
    onPinClick,
    onMapClick,
    onCameraMove,
    selectedId,
    icons,
  });
  useEffect(() => {
    handlersRef.current = { onPinClick, onMapClick, onCameraMove, selectedId, icons };
  });

  useEffect(() => {
    if (!maps || !containerRef.current || mapRef.current) return;
    const MapCtor = maps.Map as unknown as new (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => GoogleMapLike;
    const map = new MapCtor(containerRef.current, {
      center: {
        lat: cameraPosition.coordinates.latitude,
        lng: cameraPosition.coordinates.longitude,
      },
      zoom: cameraPosition.zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
    });
    map.addListener('click', () => handlersRef.current.onMapClick());
    map.addListener('dragend', () => emitCamera(map));
    map.addListener('zoom_changed', () => emitCamera(map));
    mapRef.current = map;

    function emitCamera(map: GoogleMapLike) {
      const center = map.getCenter();
      const zoom = Math.max(map.getZoom() ?? MIN_ZOOM, MIN_ZOOM);
      const latitudeDelta = 360 / 2 ** zoom;
      const longitudeDelta =
        latitudeDelta / Math.max(0.2, Math.cos((center.lat() * Math.PI) / 180));
      handlersRef.current.onCameraMove({
        coordinates: { latitude: center.lat(), longitude: center.lng() },
        zoom,
        latitudeDelta,
        longitudeDelta,
      });
    }
    // Creates the singleton map; initial camera comes from first cameraPosition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

  // Marker sync — rebuild on pins change; icons read through the ref so icon
  // updates apply on the next pin pass (pins change with every camera move).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maps) return;
    const MarkerCtor = maps.Marker as unknown as new (
      options: Record<string, unknown>,
    ) => GoogleMarkerLike;
    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = pins.map((pin) => {
      const iconUrl = handlersRef.current.icons.get(pin.id) ?? null;
      const selected = pin.kind === 'event' && pin.event.id === handlersRef.current.selectedId;
      const marker = new MarkerCtor({
        position: { lat: pin.point.latitude, lng: pin.point.longitude },
        map,
        ...(iconUrl ? { icon: { url: iconUrl, anchor: { x: 0.5, y: 1 } } } : {}),
        zIndex: selected ? 10 : 0,
      });
      marker.addListener('click', () => handlersRef.current.onPinClick(pin.id));
      return marker;
    });
  }, [maps, pins]);

  // Camera follows the prop (origin changes from focus/userLocation/cluster zoom).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter({
      lat: cameraPosition.coordinates.latitude,
      lng: cameraPosition.coordinates.longitude,
    });
    map.setZoom(cameraPosition.zoom);
  }, [cameraPosition]);

  if (failed) {
    return (
      <div style={{ ...containerStyle, ...messageStyle }}>
        Map could not load on web (missing or invalid Google Maps key). Everything else works.
      </div>
    );
  }
  if (!maps) {
    return <div style={{ ...containerStyle, ...messageStyle }}>Loading map…</div>;
  }
  return <div ref={containerRef} style={containerStyle} />;
}

const containerStyle: CSSProperties = { width: '100%', height: '100%' };

const messageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
  color: '#7A8794',
  padding: 16,
  textAlign: 'center',
};
