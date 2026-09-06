import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { EVENEMANGSKOLLEN_SOURCE, isListableEkRow, mapEkEvent } from './mapper.js';
import type { EkRow } from './types.js';

const REST_BASE = 'https://fbxkxuisgtaejhschfqf.supabase.co/rest/v1/events';
const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

const SELECT = [
  'id',
  'name',
  'description_markdown',
  'description_html',
  'start_utc',
  'end_utc',
  'state',
  'info_url',
  'shop_url',
  'image_url',
  'event_hierarchy_type',
  'organizer_name',
  'venue_name',
  'venue_city',
  'venue_address',
  'labels',
  'tags',
  'is_popular',
].join(',');

/**
 * Reads the site's public anon key. Kept as a function (not a top-level
 * constant) so `loadEnv()` in the entry point runs before the key is read in
 * tests and CLI runs alike. The key is embedded in the site's own JS bundle —
 * it is not a secret; the personal `ek_live_…` API key is NOT needed for this
 * transport.
 */
export function anonKey(): string {
  const key = process.env.EVENEMANGSKOLLEN_ANON_KEY?.trim();
  if (!key) {
    throw new Error(
      'EVENEMANGSKOLLEN_ANON_KEY is not set. Copy pipeline/.env.example to pipeline/.env ' +
        'and paste the eyJ… anon key from the evenemangskollen.se JS bundle',
    );
  }
  return key;
}

function restUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({ select: SELECT, ...params });
  return `${REST_BASE}?${query.toString()}`;
}

/**
 * Queries the same Supabase PostgREST endpoint the site's frontend uses
 * (public anon key, read-only rows). The documented `/api/v1` currently
 * returns a 503 from its CDN; this transport is what the site itself runs on.
 * Pages with `offset` until exhaustion; `stock_level`/`state` show the ticket
 * availability but only clearly dead occurrences are filtered out.
 */
export class EvenemangskollenAdapter implements SourceAdapter {
  readonly id = EVENEMANGSKOLLEN_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;
    const key = anonKey();
    const nowIso = new Date().toISOString();

    const rows: EkRow[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = restUrl({
        venue_city: 'eq.Stockholm',
        'start_utc': `gte.${nowIso}`,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      const response = await doFetch(url, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; sthlmevents-pipeline)',
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Evenemangskollen ${response.status}: anon key rejected at ${REST_BASE}`);
      }
      if (response.status === 429) {
        throw new Error(`Evenemangskollen 429: rate limited at ${REST_BASE}`);
      }
      if (!response.ok) {
        throw new Error(`Evenemangskollen ${response.status} at ${REST_BASE}`);
      }

      const payload = (await response.json()) as EkRow[];
      if (!Array.isArray(payload)) {
        throw new Error('Evenemangskollen returned an unexpected payload shape');
      }

      rows.push(...payload);

      if (payload.length < PAGE_SIZE) break;
      offset += payload.length;
    }

    return rows.filter(isListableEkRow).map(mapEkEvent);
  }
}
