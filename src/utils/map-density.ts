import type { StockholmEvent } from '@/types/event';
import { distanceKm, eventPoint, type GeoPoint } from '@/utils/geo';

/** Neighbourhood zoom — default camera and the floor where pins expand. */
export const MAP_NEIGHBOURHOOD_ZOOM = 13;

/** Grid-cluster below this zoom; individual pins at or above it. */
export const MAP_CLUSTER_BELOW_ZOOM = MAP_NEIGHBOURHOOD_ZOOM;

/** Max individual pins on screen once expanded. */
export const MAP_PIN_CAP = 40;

export type GeoBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapCameraSnapshot = {
  center: GeoPoint;
  zoom: number;
  bounds: GeoBounds;
};

export type MapPin =
  | { kind: 'event'; id: string; event: StockholmEvent; point: GeoPoint }
  | { kind: 'cluster'; id: string; count: number; point: GeoPoint };

export function boundsFromDeltas(center: GeoPoint, latitudeDelta: number, longitudeDelta: number): GeoBounds {
  const lat = Math.max(latitudeDelta, 0.002) / 2;
  const lng = Math.max(longitudeDelta, 0.002) / 2;
  return {
    north: center.latitude + lat,
    south: center.latitude - lat,
    east: center.longitude + lng,
    west: center.longitude - lng,
  };
}

/** Approximate visible region when the native camera event has no deltas yet. */
export function boundsAround(center: GeoPoint, zoom: number): GeoBounds {
  const latDelta = 360 / 2 ** Math.max(zoom, 1);
  const lngDelta = latDelta / Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180));
  return boundsFromDeltas(center, latDelta, lngDelta);
}

export function padBounds(bounds: GeoBounds, factor = 0.2): GeoBounds {
  const latPad = (bounds.north - bounds.south) * factor;
  const lngPad = (bounds.east - bounds.west) * factor;
  return {
    north: bounds.north + latPad,
    south: bounds.south - latPad,
    east: bounds.east + lngPad,
    west: bounds.west - lngPad,
  };
}

export function pointInBounds(point: GeoPoint, bounds: GeoBounds): boolean {
  return (
    point.latitude <= bounds.north &&
    point.latitude >= bounds.south &&
    point.longitude <= bounds.east &&
    point.longitude >= bounds.west
  );
}

/** Global cell size in degrees — stable while panning, doubles each zoom-out step. */
export function clusterCellDeg(zoom: number): number {
  const z = Math.floor(zoom);
  return 0.012 * 2 ** Math.max(0, 12 - z);
}

/**
 * Skip tiny pans/zooms so pin rebuilds don't run on every camera tick.
 * True when the new camera is different enough to warrant a density pass.
 */
export function cameraMovedEnough(prev: MapCameraSnapshot, next: MapCameraSnapshot): boolean {
  if (Math.abs(next.zoom - prev.zoom) > 0.15) return true;
  const latSpan = Math.max(next.bounds.north - next.bounds.south, 0.001);
  const lngSpan = Math.max(next.bounds.east - next.bounds.west, 0.001);
  if (Math.abs(next.center.latitude - prev.center.latitude) > latSpan * 0.12) return true;
  if (Math.abs(next.center.longitude - prev.center.longitude) > lngSpan * 0.12) return true;
  return false;
}

type VisibleOptions = {
  selectedId?: string | null;
  pinCap?: number;
  clusterBelowZoom?: number;
};

/**
 * What to draw: count-bubbles when zoomed out, nearest-N pins when zoomed in.
 * Selected event is always kept if it sits in the (padded) viewport.
 */
export function visibleMapPins(
  events: readonly StockholmEvent[],
  camera: MapCameraSnapshot,
  options: VisibleOptions = {},
): MapPin[] {
  const pinCap = options.pinCap ?? MAP_PIN_CAP;
  const clusterBelow = options.clusterBelowZoom ?? MAP_CLUSTER_BELOW_ZOOM;
  const padded = padBounds(camera.bounds);
  const located: { event: StockholmEvent; point: GeoPoint }[] = [];
  for (const event of events) {
    const point = eventPoint(event);
    if (!point || !pointInBounds(point, padded)) continue;
    located.push({ event, point });
  }

  const selected = options.selectedId
    ? located.find((item) => item.event.id === options.selectedId)
    : undefined;
  const rest = selected ? located.filter((item) => item.event.id !== selected.event.id) : located;

  if (camera.zoom < clusterBelow) {
    return [...clusterLocated(rest, camera.zoom), ...eventPin(selected)];
  }

  const nearest = [...rest].sort((a, b) => {
    const da = distanceKm(camera.center, a.point);
    const db = distanceKm(camera.center, b.point);
    return da - db || a.event.id.localeCompare(b.event.id);
  });
  const kept = nearest.slice(0, selected ? pinCap - 1 : pinCap);
  return [...kept.map((item) => toEventPin(item)), ...eventPin(selected)];
}

function eventPin(item: { event: StockholmEvent; point: GeoPoint } | undefined): MapPin[] {
  return item ? [toEventPin(item)] : [];
}

function toEventPin(item: { event: StockholmEvent; point: GeoPoint }): MapPin {
  return { kind: 'event', id: item.event.id, event: item.event, point: item.point };
}

function clusterLocated(
  located: readonly { event: StockholmEvent; point: GeoPoint }[],
  zoom: number,
): MapPin[] {
  const size = clusterCellDeg(zoom);
  const buckets = new Map<string, { event: StockholmEvent; point: GeoPoint }[]>();
  for (const item of located) {
    const gx = Math.floor(item.point.longitude / size);
    const gy = Math.floor(item.point.latitude / size);
    const key = `${gx}:${gy}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const pins: MapPin[] = [];
  for (const [key, members] of buckets) {
    if (members.length === 1) {
      pins.push(toEventPin(members[0]!));
      continue;
    }
    const point = centroid(members.map((member) => member.point));
    pins.push({ kind: 'cluster', id: `cluster:${key}`, count: members.length, point });
  }
  return pins;
}

function centroid(points: readonly GeoPoint[]): GeoPoint {
  let lat = 0;
  let lng = 0;
  for (const point of points) {
    lat += point.latitude;
    lng += point.longitude;
  }
  return { latitude: lat / points.length, longitude: lng / points.length };
}
