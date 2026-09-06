/**
 * Geocoding strategy: turn a free-text venue query into a coordinate. Kept as
 * an interface so the provider (Nominatim here) can be swapped — for a paid
 * key, a stubbed test double, or an in-memory gazetteer — without touching the
 * pipeline stage that consumes it.
 */

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export interface Geocoder {
  geocode(query: string): Promise<Coordinate | null>;
}

export type NominatimOptions = {
  fetchImpl?: typeof fetch;
  /** Nominatim's usage policy requires an identifying User-Agent. */
  userAgent?: string;
  timeoutMs?: number;
};

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_USER_AGENT = 'sthlmevents-pipeline/0.1 (event aggregation; contact via repository)';

type NominatimHit = {
  lat?: string;
  lon?: string;
};

/**
 * OpenStreetMap Nominatim geocoder. Free and keyless, but rate-limited to one
 * request per second and requires a descriptive User-Agent — the calling stage
 * is responsible for pacing; this class only performs and parses one lookup.
 * Results are constrained to Sweden to cut false hits on ambiguous names.
 */
export class NominatimGeocoder implements Geocoder {
  constructor(private readonly options: NominatimOptions = {}) {}

  async geocode(query: string): Promise<Coordinate | null> {
    const doFetch = this.options.fetchImpl ?? fetch;
    const url =
      `${ENDPOINT}?format=jsonv2&limit=1&countrycodes=se&q=${encodeURIComponent(query)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8000);
    try {
      const response = await doFetch(url, {
        headers: {
          'User-Agent': this.options.userAgent ?? DEFAULT_USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      if (!response.ok) return null;

      const data = (await response.json()) as NominatimHit[];
      const hit = Array.isArray(data) ? data[0] : undefined;
      if (!hit) return null;

      const latitude = Number(hit.lat);
      const longitude = Number(hit.lon);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
