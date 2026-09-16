import type { StockholmEvent } from '@/types/event';

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function eventPoint(event: StockholmEvent): GeoPoint | null {
  const { latitude, longitude } = event.venue;
  if (latitude === undefined || longitude === undefined) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Keep events that have coordinates and (optionally) lie within `radiusKm`
 * of `origin`. `radiusKm === null` means any distance.
 */
export function filterByDistance(
  events: readonly StockholmEvent[],
  origin: GeoPoint,
  radiusKm: number | null,
): StockholmEvent[] {
  return events.filter((event) => {
    const point = eventPoint(event);
    if (!point) return false;
    if (radiusKm === null) return true;
    return distanceKm(origin, point) <= radiusKm;
  });
}

/** Nearest-first. Events without coordinates are dropped (caller filters first). */
export function sortByDistance(
  events: readonly StockholmEvent[],
  origin: GeoPoint,
): StockholmEvent[] {
  return [...events]
    .map((event) => {
      const point = eventPoint(event);
      return { event, km: point ? distanceKm(origin, point) : Number.POSITIVE_INFINITY };
    })
    .sort((a, b) => a.km - b.km || a.event.id.localeCompare(b.event.id))
    .map(({ event }) => event);
}
