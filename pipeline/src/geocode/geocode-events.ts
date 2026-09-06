import type { StockholmEvent } from '../shared/event.js';
import { NullKeyedCache, type KeyedCache } from '../shared/file-cache.js';
import type { Coordinate, Geocoder } from './geocoder.js';

export type GeocodeEventsOptions = {
  geocoder: Geocoder;
  cache?: KeyedCache<Coordinate>;
  /** Minimum gap between live provider calls (Nominatim policy: >= 1000ms). */
  minIntervalMs?: number;
  onProgress?: (done: number, total: number) => void;
};

export type GeocodeEventsResult = {
  events: StockholmEvent[];
  /** Unique venues looked up (each may try several query variants). */
  attempted: number;
  /** Events that gained coordinates. */
  resolved: number;
};

const ANCHOR = ', Stockholm, Sweden';
const GENERIC_TERMS = new Set(['', 'stockholm', 'sweden', 'sverige']);

function hasCoords(event: StockholmEvent): boolean {
  return event.venue.latitude !== undefined && event.venue.longitude !== undefined;
}

function isSpecific(part: string | undefined): boolean {
  return Boolean(part) && !GENERIC_TERMS.has(part!.trim().toLowerCase());
}

/**
 * Ordered geocoding queries for a venue, most-likely-to-hit first. Nominatim
 * matches "venue name, city" reliably but chokes on long combined strings
 * ("street, venue, district, city"), so each component is its own variant and
 * the caller falls through on misses. Empty when nothing is more specific than
 * the city (geocoding "Stockholm" would mislocate the pin to city centre).
 */
export function venueQueries(event: StockholmEvent): string[] {
  const { name, address, district } = event.venue;
  const variants: string[] = [];

  if (isSpecific(address)) variants.push(`${address.trim()}${ANCHOR}`);
  if (isSpecific(name)) variants.push(`${name.trim()}${ANCHOR}`);
  if (
    isSpecific(district) &&
    district.trim().toLowerCase() !== name?.trim().toLowerCase()
  ) {
    variants.push(`${district.trim()}${ANCHOR}`);
  }

  return [...new Set(variants)];
}

function venueKey(event: StockholmEvent): string {
  return `${event.venue.name}|${event.venue.address}|${event.venue.district}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pipeline stage: fill missing coordinates by geocoding the venue. Only events
 * without coordinates and with a specific-enough venue are looked up; venues
 * are deduplicated across events and each tries its query variants in order
 * (stopping at the first hit). Live provider calls are paced by `minIntervalMs`
 * (cache hits don't count against the pace). Adapters never geocode — this runs
 * over the combined, deduped event set so a venue is resolved once for all
 * sources that share it.
 */
export async function geocodeEvents(
  events: readonly StockholmEvent[],
  options: GeocodeEventsOptions,
): Promise<GeocodeEventsResult> {
  const cache = options.cache ?? new NullKeyedCache<Coordinate>();
  const minIntervalMs = options.minIntervalMs ?? 1100;

  const variantsByVenue = new Map<string, string[]>();
  const venueByEvent = new Map<StockholmEvent, string>();
  for (const event of events) {
    if (hasCoords(event)) continue;
    const variants = venueQueries(event);
    if (variants.length === 0) continue;
    const key = venueKey(event);
    variantsByVenue.set(key, variants);
    venueByEvent.set(event, key);
  }

  const coordinateByVenue = new Map<string, Coordinate | null>();
  let done = 0;
  let lastCallAt = 0;

  for (const [key, variants] of variantsByVenue) {
    let coordinate: Coordinate | null = null;
    for (const query of variants) {
      const cached = cache.get(query);
      if (cached !== undefined) {
        coordinate = cached;
      } else {
        const wait = minIntervalMs - (Date.now() - lastCallAt);
        if (wait > 0) await sleep(wait);
        coordinate = await options.geocoder.geocode(query);
        lastCallAt = Date.now();
        cache.set(query, coordinate);
      }
      if (coordinate) break;
    }
    coordinateByVenue.set(key, coordinate);
    done += 1;
    options.onProgress?.(done, variantsByVenue.size);
  }

  let resolved = 0;
  const enriched = events.map((event) => {
    const key = venueByEvent.get(event);
    const coordinate = key ? coordinateByVenue.get(key) : undefined;
    if (coordinate) {
      resolved += 1;
      return {
        ...event,
        venue: { ...event.venue, latitude: coordinate.latitude, longitude: coordinate.longitude },
      };
    }
    return event;
  });

  return { events: enriched, attempted: variantsByVenue.size, resolved };
}
