import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { ALLEVENTS_SOURCE, mapAlleventsEvent } from './mapper.js';
import { parseAlleventsEvents } from './parse.js';
import type { AeEvent } from './types.js';

const DISCOVERY_URL = 'https://allevents.in/stockholm/all';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/**
 * allevents.in is an aggregator: it re-lists events we already ingest from
 * first-party sources, so only entries with a resolvable start time are mappable
 * (everything else can't be placed on the timeline). Cross-source duplicates
 * collapse in the shared dedup stage, never here.
 */
export function isMappableAlleventsEvent(raw: AeEvent): boolean {
  return Boolean(raw.event_id && raw.eventname && raw.start_time && Number(raw.start_time) > 0);
}

/**
 * Scrapes allevents.in's Stockholm listing. The page hydrates `_this.events_data`
 * inline in the HTML; that assignment is the source of truth here — there is no
 * JSON-LD event list and no documented feed. Yields the ~45 soonest events with
 * inline coordinates, image and categories.
 */
export class AlleventsAdapter implements SourceAdapter {
  readonly id = ALLEVENTS_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const response = await doFetch(DISCOVERY_URL, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`allevents ${response.status} at ${DISCOVERY_URL}`);
    }

    const html = await response.text();
    return parseAlleventsEvents(html).filter(isMappableAlleventsEvent).map(mapAlleventsEvent);
  }
}
