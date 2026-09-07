import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { KULTURBILJETTER_SOURCE, mapKulturbiljetterEvent } from './mapper.js';
import type { KbEventDetail, KbListResponse } from './types.js';

const API_BASE = 'https://kulturbiljetter.se/api/v3/events';

/**
 * Reads the Kulturbiljetter Events API key. Kept as a function (not a
 * top-level constant) so `loadEnv()` in the entry point runs before the key is
 * read in tests and CLI runs alike.
 */
export function apiKey(): string {
  const key = process.env.KULTURBILJETTER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'KULTURBILJETTER_API_KEY is not set. Copy pipeline/.env.example to pipeline/.env ' +
        'and paste the key from Kulturbiljetter (info@kulturbiljetter.se)',
    );
  }
  return key;
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Token ${key}`,
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; sthlmevents-pipeline)',
  };
}

/**
 * Fetches Kulturbiljetter events. The v3 API is two-phase: the list endpoint
 * returns only `{event_id, ETag}` entries; every event then needs one detail
 * request. Detail responses span all of Sweden, so mapping filters to
 * Stockholm-area venues.
 */
export class KulturbiljetterAdapter implements SourceAdapter {
  readonly id = KULTURBILJETTER_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;
    const key = apiKey();

    const ids = await this.fetchList(doFetch, key);
    const limit = options.maxPages ?? Infinity;
    const details: KbEventDetail[] = [];

    for (const entry of ids.slice(0, limit)) {
      const detail = await this.fetchDetail(doFetch, key, entry.event_id);
      if (detail) details.push(detail);
    }

    // NB: flatMap callback must wrap the mapper — flatMap leaks (element,
    // index, array) into it and the index would land in `todayLocal`.
    return details.flatMap((detail) => mapKulturbiljetterEvent(detail));
  }

  /** List endpoint: ids + ETags for every live event (numeric-keyed object). */
  private async fetchList(doFetch: typeof fetch, key: string): Promise<{ event_id: number }[]> {
    const response = await doFetch(`${API_BASE}/`, { headers: headers(key) });
    if (!response.ok) {
      throw new Error(`Kulturbiljetter ${response.status} at ${API_BASE}/`);
    }

    const payload = (await response.json()) as KbListResponse;
    return Object.values(payload)
      .filter((entry) => Number.isFinite(entry?.event_id))
      .map((entry) => ({ event_id: entry.event_id }));
  }

  /**
   * Detail endpoint for one event. Missing/ETag-stale events are handled by
   * the caller; a 404 here just means the event vanished between list and
   * detail — skip it, don't abort the run.
   */
  private async fetchDetail(
    doFetch: typeof fetch,
    key: string,
    eventId: number,
  ): Promise<KbEventDetail | null> {
    const response = await doFetch(`${API_BASE}/${eventId}`, { headers: headers(key) });
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Kulturbiljetter ${response.status}: API key rejected at ${API_BASE}/${eventId}`);
    }
    if (!response.ok) {
      throw new Error(`Kulturbiljetter ${response.status} at ${API_BASE}/${eventId}`);
    }

    const detail = (await response.json()) as KbEventDetail;
    return detail?.title ? detail : null;
  }
}
