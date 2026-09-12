import type { StockholmEvent } from '@/types/event';

/**
 * Locality heuristic: events are "local" when they happen in or near Stockholm
 * city. There is no reliable municipality field in the data (sources report
 * "Stockholm" for Bromma, which IS part of the city, and for Tumba, which
 * is not), so distance from the city centre is the only signal we have.
 *
 * Everything within LOCAL_RADIUS_KM ranks normally — that includes Bromma,
 * Solna/Sundbyberg, Lidingö, Skogskyrkogården — i.e. the area SL weekly-ticket
 * holders treat as "town". Beyond it (Vaxholm, Tumba, Sigtuna, skärgården),
 * events sink to the end of the list instead of being hidden.
 */

const CITY_CENTRE = { latitude: 59.3311, longitude: 18.0593 } as const; // Sergels torg

/** Distance from Sergels torg that still counts as "town". */
export const LOCAL_RADIUS_KM = 10;

const EARTH_RADIUS_KM = 6371;

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * True when the event has no usable coordinates (treated as local — never
 * demote on missing data) or sits within `LOCAL_RADIUS_KM` of the centre.
 */
export function isLocalEvent(event: StockholmEvent): boolean {
  const { latitude, longitude } = event.venue;
  if (latitude === undefined || longitude === undefined) return true;
  return haversineKm(CITY_CENTRE.latitude, CITY_CENTRE.longitude, latitude, longitude) <= LOCAL_RADIUS_KM;
}

/** True when coordinates exist but point far outside the city. */
export function isOutOfTown(event: StockholmEvent): boolean {
  const { latitude, longitude } = event.venue;
  if (latitude === undefined || longitude === undefined) return false;
  return haversineKm(CITY_CENTRE.latitude, CITY_CENTRE.longitude, latitude, longitude) > LOCAL_RADIUS_KM;
}
